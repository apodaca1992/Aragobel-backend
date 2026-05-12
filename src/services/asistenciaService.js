const Firestore = require('../utils/firestoreUtils'); // Importamos el objeto completo
const { admin } = require('../../config/firebase');
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
    // 1. Normalizar el tipo a mayúsculas de inmediato
    if (data.tipo) {
        data.tipo = data.tipo.toUpperCase(); // "entrada" -> "ENTRADA"
    }

    // --- 2. VALIDACIÓN DE GEOCERCA (NUEVA) ---
    if (!data.id_tienda) throw new AppError('No se especificó la tienda', 400);

    const tienda = await Firestore.findByPk('tiendas', data.id_tienda);
    if (!tienda) throw new AppError('La tienda no existe', 404);

    // 1. Obtener tiempo oficial de Mazatlán
    const now = new Date();
    const localTime = now.toLocaleString("sv-SE", { timeZone: tienda.configuracion_asistencia.time_zone });
    const [fecha, hora] = localTime.split(' ');

    // --- VALIDACIÓN DE DUPLICADOS ---
    // Buscamos si ya existe una asistencia para este usuario, este día y este tipo
    const registrosExistentes = await Firestore.findAll('asistencias', {
        filtros: {
            id_usuario: data.id_usuario,
            id_tienda: data.id_tienda,
            fecha: fecha,
            tipo: data.tipo.toUpperCase(),
            activo: 1 // IMPORTANTE: Para que tu findAll no use el default
        },
        limit: 1
    });

    if (registrosExistentes.length > 0) {
        throw new AppError(`Ya existe un registro de ${data.tipo} para hoy`, 400);
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

    // --- 3. LÓGICA ESPECÍFICA PARA ENTRADA (Snapshot de Configuración) ---
    if (data.tipo === 'ENTRADA') {
        const usuario = await Firestore.findByPk('usuarios', data.id_usuario);
        if (!usuario) throw new AppError('Usuario no encontrado', 404);

        // Buscar la configuración de la tienda asignada al usuario
        const tiendaConfig = usuario.tiendas_asignadas?.find(t => t.id_tienda === data.id_tienda);
        
        // Inyectamos la meta del día (snapshot)
        data.jornada_efectiva = tiendaConfig?.jornada_efectiva ?? 9.5;
        data.tiempo_comida_max = tiendaConfig?.tiempo_comida_max ?? 1.5;
    }

    // Inyectamos directamente en el objeto 'data'
    data.fecha = fecha;
    data.hora = hora;    
    // Convertimos la ubicación a GeoPoint nativo en la misma propiedad
    data.ubicacion = new admin.firestore.GeoPoint(
        parseFloat(data.ubicacion.lat), 
        parseFloat(data.ubicacion.lng)
    );

    return await Firestore.create('asistencias',data);
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

    const resultadoUpdate = await Firestore.update('asistencias',id,data);

    return {
        ...asistenciaExistente, // Trae id, activo, createdAt, etc.
        ...resultadoUpdate  // Sobrescribe los campos cambiados y trae el nuevo updatedAt
    };
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