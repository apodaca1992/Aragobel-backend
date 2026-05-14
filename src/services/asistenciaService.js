const Firestore = require('../utils/firestoreUtils'); // Importamos el objeto completo
const { db, admin } = require('../../config/firebase');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const geoUtils = require('../utils/geoUtils');

const getAll = async (opciones = {}) => {
    // 1. Extraemos los filtros de las opciones
    let { filtros = {} } = opciones;

    // 2. Lógica de Negocio: Si viene una fecha y es 'TODAY', inyectamos la fecha del servidor    
    // Esto garantiza que el cliente no tenga que calcularla
    if (typeof filtros.fecha === 'string' && filtros.fecha.startsWith('TODAY')) {
        let timeZone = "America/Mazatlan"; // Default por seguridad

        // 2. Intentamos extraer el ID de la tienda después del '|'
        const partes = filtros.fecha.split('|'); // ['TODAY', 'wEKDul8fyZuLeOKBbVSu']
        const idTiendaDesdeFiltro = partes[1];

        if (idTiendaDesdeFiltro) {
            const tienda = await Firestore.findByPk('tiendas', idTiendaDesdeFiltro);
            if (tienda && tienda.configuracion_asistencia?.time_zone) {
                timeZone = tienda.configuracion_asistencia.time_zone;
            }
        }

        filtros.fecha = new Date().toLocaleString("sv-SE", { 
            timeZone: timeZone 
        }).split(' ')[0]; 
    }

    return await Firestore.findAll('asistencias',opciones);
}
   
const getById = async (id, user) => {

    const asistenciaExistente = await Firestore.findByPk('asistencias',id);

    if (!asistenciaExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`La asistencia '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    // Validación de pertenencia
    if (asistenciaExistente.id_empresa !== user.id_empresa) {
        logger.warn(`Intento para acceso NO AUTORIZADO: Usuario ${user.id} intentó obtener la asistencia ${id}`);
        throw new AppError('No tienes permiso para acceder a esta asistencia', 403);
    }

    return asistenciaExistente;
}

const create = async (data) => {
    if (!data.tipo) throw new AppError('El tipo de checada es obligatorio', 400);
    const tipoUpper = data.tipo.toUpperCase();

    // --- 2. VALIDACIÓN DE GEOCERCA (NUEVA) ---
    if (!data.id_tienda) throw new AppError('No se especificó la tienda', 400);

    const tienda = await Firestore.findByPk('tiendas', data.id_tienda);
    if (!tienda) throw new AppError('La tienda no existe', 404);

    // 1. Obtener tiempo oficial de Mazatlán
    const timeZone = tienda.configuracion_asistencia?.time_zone || "America/Mazatlan";
    const localTime = new Date().toLocaleString("sv-SE", { timeZone });
    const [fecha, hora] = localTime.split(' ');

    // 2. Definir ID ÚNICO por día y usuario
    const docId = `${data.id_usuario}_${fecha}_${data.id_tienda}`;
    const docRef = db.collection('asistencias').doc(docId);

    // --- VALIDACIÓN DE DUPLICADOS ---
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        const jornada = docSnap.data();
        if (jornada.eventos && jornada.eventos[tipoUpper]) {
            throw new AppError(`Ya existe un registro de ${tipoUpper} para hoy`, 400);
        }
    }

    // Extraemos coordenadas de la tienda (asumiendo que en Firestore son GeoPoint o tienen lat/lng)
    const tiendaLat = tienda.ubicacion._latitude || tienda.ubicacion.lat;
    const tiendaLng = tienda.ubicacion._longitude || tienda.ubicacion.lng;

    // Coordenadas que envía el usuario desde el móvil
    const userLat = parseFloat(data.ubicacion.lat);
    const userLng = parseFloat(data.ubicacion.lng);

    const distancia = geoUtils.calcularDistanciaMetros(userLat, userLng, tiendaLat, tiendaLng);
    const RADIO_MAXIMO = 200; // 200 metros de tolerancia

    if (distancia > RADIO_MAXIMO) {
        logger.warn(`Intento de checada fuera de rango: Usuario a ${Math.round(distancia)} metros`);
        throw new AppError(`Estás demasiado lejos de la tienda (${Math.round(distancia)}m).`, 403);
    }

    // 5. Preparar objeto de actualización (Dot Notation para no borrar otros eventos)
    const updateData = {
        id_usuario: data.id_usuario,
        nombre_usuario: data.nombre_usuario,
        fecha: fecha,
        id_tienda: data.id_tienda,
        id_empresa: data.id_empresa,
        activo: 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Usamos el bracket notation para que la llave sea dinámica (ENTRADA, SALIDA, etc)
    // Pero la enviamos como un objeto anidado real
    updateData['eventos'] = {
        [tipoUpper]: {
            hora: hora,
            ubicacion: new admin.firestore.GeoPoint(userLat, userLng),
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        }
    };

    // --- 3. LÓGICA ESPECÍFICA PARA ENTRADA (Snapshot de Configuración) ---
    if (tipoUpper === 'ENTRADA') {
        const usuario = await Firestore.findByPk('usuarios', data.id_usuario);
        if (!usuario) throw new AppError('Usuario no encontrado', 404);

        // Buscar la configuración de la tienda asignada al usuario
        const tiendaConfig = usuario.tiendas_asignadas?.find(t => t.id_tienda === data.id_tienda);
        
        // Inyectamos la meta del día (snapshot)
        updateData.createdAt = admin.firestore.FieldValue.serverTimestamp();
        updateData.jornada_efectiva = tiendaConfig?.jornada_efectiva ?? 9.5;
        updateData.tiempo_comida_max = tiendaConfig?.tiempo_comida_max ?? 1.5;
    }

    // 6. Guardar con MERGE (Crea si no existe, actualiza si sí)
    await docRef.set(updateData, { merge: true });

    return { id: docId, ...updateData };
}

const update = async (id, data, user) => {
    const asistenciaExistente = await Firestore.findByPk('asistencias',id);
    if (!asistenciaExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`La asistencia '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    // 2. Validar que la tienda le pertenezca a la empresa del usuario
    if (asistenciaExistente.id_empresa !== user.id_empresa) {
        logger.warn(`Intento de edición NO AUTORIZADO: Usuario ${user.id} intentó editar asistencia ${id}`);
        throw new AppError('No tienes permiso para editar esta asistencia', 403);
    }

    // Si data trae "eventos", hay que tener cuidado de no sobrescribir todo el mapa
    // Una opción es normalizar a dot notation si detectas el objeto eventos
    let dataFinal = { ...data };
    if (data.eventos) {
        // Recorremos los tipos de eventos (ENTRADA, SALIDA, etc.)
        Object.keys(data.eventos).forEach(tipo => {
            const camposEvento = data.eventos[tipo]; // { hora: "...", comentario: "..." }
            
            // Recorremos cada campo dentro del evento para crear la ruta completa
            Object.keys(camposEvento).forEach(campo => {
                const rutaPunto = `eventos.${tipo}.${campo}`;
                dataFinal[rutaPunto] = camposEvento[campo];
            });
        });
        
        // Eliminamos el objeto 'eventos' original para que no sobrescriba todo
        delete dataFinal.eventos;
    }

    await Firestore.update('asistencias', id, dataFinal);
    // 3. LA CLAVE: Volvemos a consultar el documento de la DB 
    // para obtener la estructura final ya procesada por Firestore
    const asistenciaActualizada = await Firestore.findByPk('asistencias', id);
    return asistenciaActualizada;
};

const remove = async (id, user) => {
    const asistenciaExistente = await Firestore.findByPk('asistencias',id);
    if (!asistenciaExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`La asistencia '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    // Validación de pertenencia
        if (asistenciaExistente.id_empresa !== user.id_empresa) {
            logger.warn(`Intento para eliminación NO AUTORIZADO: Usuario ${user.id} intentó borrar la asistencia ${id}`);
            throw new AppError('No tienes permiso para borrar a esta asistencia', 403);
        }

    const resultadoSoftDelete= await Firestore.softDelete('asistencias',id);

    return {
        ...asistenciaExistente, // Trae id, activo, createdAt, etc.
        ...resultadoSoftDelete  // Sobrescribe los campos cambiados y trae el nuevo updatedAt
    };
};

module.exports = { getAll, getById, create, update, remove };