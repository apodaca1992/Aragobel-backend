const Firestore = require('../utils/firestoreUtils'); // Importamos el objeto completo
const { db, admin } = require('../../config/firebase');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const geoUtils = require('../utils/geoUtils');
const pdfGenerator = require('../utils/pdfGenerator');

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

// Función utilitaria interna para combinar la fecha base con las horas teóricas y sus desfases
const crearTimestampConDesfase = (fechaBaseStr, horaTeoricaStr, diasDesfase = 0, timeZone) => {
    const [year, month, day] = fechaBaseStr.split('-').map(Number);
    const [hrs, mins, secs] = horaTeoricaStr.split(':').map(Number);
    
    let fecha = new Date(new Date().toLocaleString("sv-SE", { timeZone }));
    fecha.setFullYear(year, month - 1, day);
    fecha.setHours(hrs, mins, secs || 0, 0);
    
    if (diasDesfase > 0) {
        fecha.setDate(fecha.getDate() + diasDesfase);
    }
    
    return admin.firestore.Timestamp.fromDate(fecha);
};

const create = async (data) => {
    if (!data.tipo) throw new AppError('El tipo de checada es obligatorio', 400);
    const tipoUpper = data.tipo.toUpperCase();

    if (!data.id_tienda) throw new AppError('No se especificó la tienda', 400);

    const tienda = await Firestore.findByPk('tiendas', data.id_tienda);
    if (!tienda) throw new AppError('La tienda no existe', 404);

    const timeZone = tienda.configuracion_asistencia?.time_zone || "America/Mazatlan";
    const horaServidor = admin.firestore.FieldValue.serverTimestamp();

    let docRef;
    let jornadaExistente = null;

    // Obtener la fecha local actual según la zona horaria de la tienda antes de validar
    const localTime = new Date().toLocaleString("sv-SE", { timeZone });
    const [fechaHoy, horaHoy] = localTime.split(' ');

    // =========================================================================
    // 🔍 LOCALIZACIÓN OPTIMIZADA DE JORNADA / CANDADO DE DUPLICADOS EN ENTRADA
    // =========================================================================
    if (tipoUpper === 'ENTRADA') {
        // 1. Verificar si hay una jornada abierta y colgada actualmente
        const checklistActiva = await db.collection('asistencias')
            .where('id_usuario', '==', data.id_usuario)
            .where('status_jornada', '==', 'ACTIVA')
            .limit(1)
            .get();

        if (!checklistActiva.empty) {
            throw new AppError('No puedes registrar una entrada porque ya tienes una jornada activa abierta.', 400);
        }

        // 2. Obtener el esquema del usuario para poder realizar la validación de duplicado exacto
        const usuario = await Firestore.findByPk('usuarios', data.id_usuario);
        if (!usuario) throw new AppError('Usuario no encontrado', 404);

        const tiendaConfig = usuario.tiendas_asignadas?.find(t => t.id_tienda === data.id_tienda);
        const esquema = (tiendaConfig?.tipo_esquema || "LIBRE").toUpperCase();

        // 3. 🚨 CANDADO DE DUPLICADOS HISTÓRICOS POR FECHA Y ESQUEMA 🚨
        const chequeoDuplicado = await db.collection('asistencias')
            .where('fecha', '==', fechaHoy)
            .where('id_usuario', '==', data.id_usuario)
            .where('id_tienda', '==', data.id_tienda)
            .where('id_empresa', '==', data.id_empresa)
            .where('tipo_esquema', '==', esquema)
            .limit(1)
            .get();

        if (!chequeoDuplicado.empty) {
            throw new AppError(`Ya cuentas con un registro de asistencia generado para el día de hoy (${fechaHoy}) bajo el esquema ${esquema}.`, 400);
        }

        // Si pasa ambos filtros, se permite inicializar el nuevo documento descriptor
        docRef = db.collection('asistencias').doc();
        // Guardamos temporalmente la información del usuario en el scope para evitar re-consultar abajo
        data._usuarioCache = usuario;
        data._tiendaConfigCache = tiendaConfig;
    } else {
        if (!data.id_jornada) {
            throw new AppError('Falta el identificador de la jornada actual (id_jornada).', 400);
        }

        docRef = db.collection('asistencias').doc(data.id_jornada);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            throw new AppError('La jornada especificada no existe en el sistema.', 404);
        }

        jornadaExistente = docSnap.data();

        if (jornadaExistente.status_jornada !== 'ACTIVA') {
            throw new AppError('Esta jornada ya no se encuentra activa. Debes iniciar un nuevo registro de Entrada.', 400);
        }
    }

    // --- VALIDACIÓN DE GEOCERCA ---
    const tiendaLat = tienda.ubicacion._latitude || tienda.ubicacion.lat;
    const tiendaLng = tienda.ubicacion._longitude || tienda.ubicacion.lng;
    const userLat = parseFloat(data.ubicacion.lat);
    const userLng = parseFloat(data.ubicacion.lng);

    const distancia = geoUtils.calcularDistanciaMetros(userLat, userLng, tiendaLat, tiendaLng);
    const RADIO_MAXIMO = tienda.configuracion_asistencia?.radio_maximo_metros || 200;

    if (distancia > RADIO_MAXIMO) {
        logger.warn(`Intento de checada fuera de rango: Usuario a ${Math.round(distancia)} metros`);
        throw new AppError(`Estás demasiado lejos de la tienda (${Math.round(distancia)}m).`, 403);
    }

    // --- 🚨 CANDADOS DE FLUJO DE NEGOCIO (ESTRUCTURA DE MAPA CLAVE-VALOR) 🚨 ---
    if (jornadaExistente) {
        const tipoEsquemaActual = (jornadaExistente.tipo_esquema || "LIBRE").toUpperCase();
        const comidasMap = jornadaExistente.eventos?.comidas || {};
        const listaComidasKeys = Object.keys(comidasMap).sort(); 
        const ultimaKey = listaComidasKeys[listaComidasKeys.length - 1];
        const ultimaComida = ultimaKey ? comidasMap[ultimaKey] : null;
        
        const comidasAsignadas = jornadaExistente.config_comidas || [];

        if (tipoUpper === 'SALIDA' && jornadaExistente.eventos?.SALIDA) {
            throw new AppError('Ya registraste tu salida para esta jornada.', 400);
        }

        if ((tipoUpper === 'COMIDA_INICIO' || tipoUpper === 'COMIDA_FIN') && comidasAsignadas.length === 0) {
            throw new AppError('Tu perfil está configurado con horario corrido. No tienes permitido registrar salidas a comer.', 400);
        }

        if (tipoUpper === 'SALIDA' && comidasAsignadas.length > 0) {
            if (listaComidasKeys.length === 0 || (ultimaComida && !ultimaComida.COMIDA_FIN)) {
                throw new AppError('No puedes registrar tu salida final porque no has completado tus registros de comida (Inicio/Fin).', 400);
            }
        }

        if (tipoEsquemaActual === 'FIJO') {
            if (tipoUpper === 'COMIDA_INICIO' && comidasAsignadas.length > 0) {
                const indexSiguienteComida = listaComidasKeys.length; 
                const comidaPactada = comidasAsignadas[indexSiguienteComida];
                
                if (comidaPactada) {
                    const ahoraTimestamp = admin.firestore.Timestamp.now();
                    if (ahoraTimestamp.seconds < comidaPactada.hora_salida_comer.seconds) {
                        throw new AppError(`Aún no es tu hora asignada para salir a: ${comidaPactada.nombre}.`, 403);
                    }
                }
            }
        }

        if (tipoUpper === 'COMIDA_INICIO' && ultimaComida && !ultimaComida.COMIDA_FIN) {
            throw new AppError('No puedes iniciar otra comida sin haber regresado de la anterior.', 400);
        }
        if (tipoUpper === 'COMIDA_FIN' && (!ultimaComida || (ultimaComida && ultimaComida.COMIDA_FIN))) {
            throw new AppError('No has registrado una salida a comer activa para poder marcar un regreso.', 400);
        }
    }

    // =========================================================================
    // 🛠️ CONSTRUCCIÓN DEL OBJETO DE ACTUALIZACIÓN
    // =========================================================================
    const updateData = {
        id_usuario: data.id_usuario,
        nombre_usuario: data.nombre_usuario,
        id_tienda: data.id_tienda,
        id_empresa: data.id_empresa,
        activo: 1,
        updatedAt: horaServidor,
    };

    const geoPointUbicacion = new admin.firestore.GeoPoint(userLat, userLng);

    let tipoEsquemaResp = jornadaExistente?.tipo_esquema || "LIBRE";
    let statusJornadaResp = jornadaExistente?.status_jornada || "ACTIVA";
    let fechaJornadaResp = jornadaExistente?.fecha || fechaHoy;

    // --- CASO A: REGISTRO DE ENTRADA ---
    if (tipoUpper === 'ENTRADA') {
        // Recuperamos las configuraciones guardadas previamente en la validación de arriba
        const tiendaConfig = data._tiendaConfigCache;
        const esquema = (tiendaConfig?.tipo_esquema || "LIBRE").toUpperCase();
        
        updateData.createdAt = horaServidor;
        updateData.fecha = fechaHoy;
        updateData.status_jornada = "ACTIVA";
        updateData.tipo_esquema = esquema;

        tipoEsquemaResp = esquema;
        statusJornadaResp = "ACTIVA";
        fechaJornadaResp = fechaHoy;

        if (esquema === 'LIBRE') {
            updateData.jornada_efectiva = tiendaConfig?.jornada_efectiva ?? 9.5;
            
            const configComidasUsuario = tiendaConfig?.config_comidas || [];
            updateData.config_comidas = configComidasUsuario.map(c => ({
                nombre: c.nombre || "Comida",
                tiempo_comida_max: c.tiempo_comida_max ?? 1.5
            }));
        } 
        else if (esquema === 'FIJO') {
            const horaEntradaStr = tiendaConfig?.hora_entrada || "08:00:00"; 
            const horaSalidaStr = tiendaConfig?.hora_salida || "17:30:00";   
            const diasDesfaseSalida = tiendaConfig?.dias_desfase || 0;

            const hRealDecimal = parseHoraADecimal(horaHoy);            
            const hPactadaDecimal = parseHoraADecimal(horaEntradaStr); 

            if (hRealDecimal < hPactadaDecimal) {
                throw new AppError(`Aún no es tu hora de entrada oficial (${horaEntradaStr.substring(0, 5)}).`, 403);
            }
            if (hRealDecimal > (hPactadaDecimal + 2.0)) {
                throw new AppError(`No puedes checar entrada. Retardo excesivo mayor a 2 horas.`, 403);
            }

            updateData.tolerancia_minutos = tiendaConfig?.tolerancia_minutos ?? 0;

            updateData.hora_entrada = crearTimestampConDesfase(fechaHoy, horaEntradaStr, 0, timeZone); 
            updateData.hora_salida = crearTimestampConDesfase(fechaHoy, horaSalidaStr, diasDesfaseSalida, timeZone); 

            const comidasPactadas = tiendaConfig?.config_comidas || [];
            updateData.config_comidas = comidasPactadas.map(c => ({ 
                nombre: c.nombre,
                hora_salida_comer: crearTimestampConDesfase(fechaHoy, c.hora_comida_inicio, c.dias_desfase_comida_inicio || 0, timeZone), 
                hora_regreso_comer: crearTimestampConDesfase(fechaHoy, c.hora_comida_fin, c.dias_desfase_comida_fin || 0, timeZone) 
            }));
        }

        updateData.eventos = {
            ENTRADA: {
                timestamp: admin.firestore.Timestamp.now(),
                ubicacion: geoPointUbicacion
            },
            comidas: {}
        };

        // Eliminar las variables temporales de caché antes de guardar en Firestore
        delete data._usuarioCache;
        delete data._tiendaConfigCache;

        await docRef.set(updateData, { merge: true });
    }

    // --- CASO B: SALIDA A COMER (COMIDA_INICIO) ---
    else if (tipoUpper === 'COMIDA_INICIO') {
        const entradaRealDate = jornadaExistente.eventos.ENTRADA.timestamp.toDate();
        const hoyDate = new Date();
        const diasDesfase = Math.floor((hoyDate - entradaRealDate) / (1000 * 60 * 60 * 24));

        const comidasMap = jornadaExistente.eventos?.comidas || {};
        const totalComidasMarcadas = Object.keys(comidasMap).length;
        
        const campoDinamico = `eventos.comidas.comida_${totalComidasMarcadas}.COMIDA_INICIO`;

        updateData[campoDinamico] = {
            timestamp: admin.firestore.Timestamp.fromDate(hoyDate),
            ubicacion: geoPointUbicacion,
            dias_desfase_comida_inicio: diasDesfase
        };

        await docRef.update(updateData);
    }

    // --- CASO C: REGRESO DE COMER (COMIDA_FIN) ---
    else if (tipoUpper === 'COMIDA_FIN') {
        const entradaRealDate = jornadaExistente.eventos.ENTRADA.timestamp.toDate();
        const hoyDate = new Date();
        const diasDesfase = Math.floor((hoyDate - entradaRealDate) / (1000 * 60 * 60 * 24));

        const comidasMap = jornadaExistente.eventos?.comidas || {};
        const totalComidasMarcadas = Object.keys(comidasMap).length;
        const indexUltima = Math.max(0, totalComidasMarcadas - 1);
        
        const campoDinamico = `eventos.comidas.comida_${indexUltima}.COMIDA_FIN`;

        updateData[campoDinamico] = {
            timestamp: admin.firestore.Timestamp.fromDate(hoyDate),
            ubicacion: geoPointUbicacion,
            dias_desfase_comida_fin: diasDesfase
        };

        await docRef.update(updateData);
    }

    // --- CASO D: SALIDA FINAL ---
    else if (tipoUpper === 'SALIDA') {
        updateData.status_jornada = "COMPLETADA";
        updateData['eventos.SALIDA'] = {
            timestamp: admin.firestore.Timestamp.now(),
            ubicacion: geoPointUbicacion
        };

        statusJornadaResp = "COMPLETADA";

        await docRef.update(updateData);
    }

    // =========================================================================
    // 🧼 SANITIZACIÓN DE LA RESPUESTA JSON (FRONTEND FRIENDLY)
    // =========================================================================
    const fechaISO = new Date().toISOString(); 

    return {
        id: docRef.id,
        id_usuario: data.id_usuario,
        nombre_usuario: data.nombre_usuario,
        id_tienda: data.id_tienda,
        id_empresa: data.id_empresa,
        activo: 1,
        status_jornada: statusJornadaResp,
        tipo_esquema: tipoEsquemaResp,
        fecha: fechaJornadaResp,
        updatedAt: fechaISO,
        ...(tipoUpper === 'ENTRADA' && {
            createdAt: fechaISO,
            config_comidas: updateData.config_comidas,
            ...(tipoEsquemaResp === 'FIJO' && { tolerancia_minutos: updateData.tolerancia_minutos }),
            ...(tipoEsquemaResp === 'LIBRE' && { journey_efectiva: updateData.jornada_efectiva })
        }),
        evento_registrado: {
            tipo: tipoUpper,
            timestamp: fechaISO,
            ubicacion: `${userLat.toFixed(6)},${userLng.toFixed(6)}`
        }
    };
};

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

const getReporteHoras = async (opciones = {}) => {
    const asistencias = await Firestore.findAll('asistencias', opciones);
    const reporteMap = {};
    const now = new Date();

    // Helper para obtener el objeto Date real respetando la zona horaria (evita desfases de UTC)
    const obtenerDateConTZ = (timestamp, timeZone = "America/Mazatlan") => {
        if (!timestamp) return null;
        let dateObj;
        if (typeof timestamp.toDate === 'function') dateObj = timestamp.toDate();
        else if (timestamp instanceof Date) dateObj = timestamp;
        else if (timestamp._seconds || timestamp.seconds) dateObj = new Date((timestamp._seconds || timestamp.seconds) * 1000);
        else if (typeof timestamp === 'string' && !isNaN(Date.parse(timestamp))) dateObj = new Date(timestamp);
        else return null;

        // Ajuste forzado de zona horaria para cálculos numéricos puros
        const tzAjuste = new Date(dateObj.toLocaleString("en-US", { timeZone }));
        return tzAjuste;
    };

    // Helper estético para el reporte escrito
    const desglosarTimestamp = (timestamp, timeZone = "America/Mazatlan") => {
        const dateObj = obtenerDateConTZ(timestamp, timeZone);
        if (!dateObj) return null;
        return {
            fecha: dateObj.toLocaleDateString("sv-SE"), // "YYYY-MM-DD"
            hora: dateObj.toLocaleTimeString("sv-SE", { hour12: false }) // "HH:MM:SS"
        };
    };

    for (const asist of asistencias) {
        const userId = asist.id_usuario;
        const tipoEsquema = asist.tipo_esquema || "LIBRE";
        const timeZone = asist.time_zone || "America/Mazatlan"; 
        
        if (!reporteMap[userId]) {
            reporteMap[userId] = {
                id_usuario: userId,
                nombre: asist.nombre_usuario,
                foto: asist.nombre_usuario ? asist.nombre_usuario.charAt(0).toUpperCase() : "?",
                total_horas: 0,
                extras: 0,
                faltantes: 0,
                asistencias: []
            };
        }

        const eventos = asist.eventos || {};
        const entradaReal = eventos.ENTRADA || asist['eventos.ENTRADA'];
        const salidaReal = eventos.SALIDA || asist['eventos.SALIDA'];
        const comidasMap = eventos.comidas || asist['eventos.comidas'] || {};

        let horasEfectivas = 0;
        let infoEntrada = { hora: "N/A", fecha: "N/A" };
        let infoSalida = { hora: "N/A", fecha: "N/A" };
        
        let comidasRegistradas = [];
        let tiempoTotalComidasDecimal = 0;

        let estatusLabel = "A tiempo";
        let colorJornada = "light";
        let diferencia = 0;
        let jornadaAsignadaCalculo = 0;

        const tsEntrada = entradaReal?.timestamp || entradaReal;

        if (tsEntrada) {
            // 1. Obtener instancias de fecha real para la Entrada
            const dateEntrada = obtenerDateConTZ(tsEntrada, timeZone);
            infoEntrada = desglosarTimestamp(tsEntrada, timeZone) || { hora: "N/A", fecha: "N/A" };

            // 2. Obtener instancias de fecha real para la Salida
            const tsSalida = salidaReal?.timestamp || salidaReal;
            let dateSalida;

            if (tsSalida) {
                dateSalida = obtenerDateConTZ(tsSalida, timeZone);
                infoSalida = desglosarTimestamp(tsSalida, timeZone) || { hora: "N/A", fecha: "N/A" };
            } else {
                dateSalida = obtenerDateConTZ(now, timeZone);
                infoSalida = { hora: "EN CURSO...", fecha: dateSalida.toLocaleDateString("sv-SE") };
            }

            // CALCULO MAESTRO MULTIDÍA: Diferencia matemática basada en milisegundos reales
            // (1 hora = 3,600,000 milisegundos)
            let horasTranscurridasTotales = Math.max(0, (dateSalida - dateEntrada) / 3600000);

            // 3. Procesar las N comidas acumulando sus duraciones reales
            const listaComidasKeys = Object.keys(comidasMap).sort(); 
            
            for (const key of listaComidasKeys) {
                const itemComida = comidasMap[key];
                const tsInicioComida = itemComida.COMIDA_INICIO?.timestamp || itemComida.COMIDA_INICIO;
                const tsFinComida = itemComida.COMIDA_FIN?.timestamp || itemComida.COMIDA_FIN;

                let inicioDesglosado = desglosarTimestamp(tsInicioComida, timeZone) || { hora: "N/A", fecha: "N/A" };
                let finDesglosado = desglosarTimestamp(tsFinComida, timeZone) || { hora: "N/A", fecha: "N/A" };

                let horasDeEstaComida = 0;
                const dateInComida = obtenerDateConTZ(tsInicioComida, timeZone);
                const dateOutComida = obtenerDateConTZ(tsFinComida, timeZone);

                if (dateInComida && dateOutComida) {
                    // Cálculo multidía también para los descansos en ruta
                    horasDeEstaComida = Math.max(0, (dateOutComida - dateInComida) / 3600000);
                    tiempoTotalComidasDecimal += horasDeEstaComida;
                } else if (dateInComida && !dateOutComida) {
                    const configComidaActual = asist.config_comidas?.[comidasRegistradas.length] || asist.config_comidas?.[0];
                    horasDeEstaComida = configComidaActual?.tiempo_comida_max || 1.5;
                    tiempoTotalComidasDecimal += horasDeEstaComida;
                    finDesglosado.hora = "EN COMIDA...";
                }

                comidasRegistradas.push({
                    identificador: key,
                    salida_comer: { hora: inicioDesglosado.hora, fecha: inicioDesglosado.fecha },
                    regreso_comer: { hora: finDesglosado.hora, fecha: finDesglosado.fecha },
                    duracion_horas: Number(horasDeEstaComida.toFixed(2))
                });
            }

            // -------------------------------------------------------------
            // CAMINO A: PROCESAMIENTO ESQUEMA LIBRE
            // -------------------------------------------------------------
            if (tipoEsquema === 'LIBRE') {
                const jornadaMeta = asist.jornada_efectiva || 9.5;
                jornadaAsignadaCalculo = jornadaMeta;

                // Restamos el acumulado de todas las comidas del tiempo total de viaje
                horasEfectivas = Math.max(0, horasTranscurridasTotales - tiempoTotalComidasDecimal);
                let diferenciaOriginal = horasEfectivas - jornadaMeta;
                diferencia = Number(diferenciaOriginal.toFixed(2));

                if (horasEfectivas > 0) {
                    if (diferencia > 0) {
                        estatusLabel = `Extra (${diferencia.toFixed(2)} hrs)`;
                        colorJornada = "success";
                    } else if (diferencia < 0) {
                        estatusLabel = `Faltante (${Math.abs(diferencia).toFixed(2)} hrs)`;
                        colorJornada = "danger";
                    }
                } else {
                    estatusLabel = `Faltante (${jornadaMeta.toFixed(2)} hrs)`;
                    colorJornada = "danger";
                }
            }
            // -------------------------------------------------------------
            // CAMINO B: PROCESAMIENTO ESQUEMA FIJO (Basado en Fechas Reales)
            // -------------------------------------------------------------
            else if (tipoEsquema === 'FIJO') {
                // Instancias completas Date de las configuraciones teóricas oficiales guardadas en la entrada
                const dateEntradaTeorica = obtenerDateConTZ(asist.hora_entrada, timeZone);
                const dateSalidaTeorica = obtenerDateConTZ(asist.hora_salida, timeZone);

                const dateEntradaReal = obtenerDateConTZ(tsEntrada, timeZone);
                const dateSalidaReal = dateSalida; // Ya calculado arriba dinámicamente con tsSalida o 'now'

                const toleranceHoras = (asist.tolerancia_minutos || 0) / 60;

                let comidaTeoricaTotal = 0;
                if (asist.config_comidas && asist.config_comidas.length > 0) {
                    asist.config_comidas.forEach(c => {
                        const dateInComidaTeorica = obtenerDateConTZ(c.hora_salida_comer, timeZone);
                        const dateOutComidaTeorica = obtenerDateConTZ(c.hora_regreso_comer, timeZone);
                        if (dateInComidaTeorica && dateOutComidaTeorica) {
                            comidaTeoricaTotal += (dateOutComidaTeorica - dateInComidaTeorica) / 3600000;
                        }
                    });
                } else {
                    comidaTeoricaTotal = 1.5;
                }

                // Cálculo oficial de la jornada esperada
                jornadaAsignadaCalculo = ((dateSalidaTeorica - dateEntradaTeorica) / 3600000) - comidaTeoricaTotal;

                let acumuladoMinutosFaltantes = 0;
                let flagsFaltasOretardos = [];

                // Validación de Retardo (Usa milisegundos absolutos sumando el offset de tolerancia)
                const dateEntradaConTolerancia = new Date(dateEntradaTeorica.getTime() + (toleranceHoras * 3600000));
                if (dateEntradaReal > dateEntradaConTolerancia) {
                    const minRetardo = Math.round((dateEntradaReal - dateEntradaTeorica) / 60000);
                    flagsFaltasOretardos.push(`Retardo (${minRetardo} min)`);
                    acumuladoMinutosFaltantes += minRetardo;
                }

                // Validación de Exceso de Comida
                if (tiempoTotalComidasDecimal > comidaTeoricaTotal) {
                    const minExcesoComida = Math.round((tiempoTotalComidasDecimal - comidaTeoricaTotal) * 60);
                    flagsFaltasOretardos.push(`Exceso Comida (${minExcesoComida} min)`);
                    acumuladoMinutosFaltantes += minExcesoComida;
                }

                // Asignación de Horas Efectivas Netas Trabajadas
                horasEfectivas = Math.max(0, horasTranscurridasTotales - tiempoTotalComidasDecimal);

                // Validación de Salida Anticipada por Límites de Fechas
                if (!tsSalida) {
                    if (dateSalidaReal < dateSalidaTeorica) {
                        estatusLabel = "EN CURSO...";
                        colorJornada = "light";
                    }
                } else if (dateSalidaReal < dateSalidaTeorica) {
                    const minSalidaAnticipada = Math.round((dateSalidaTeorica - dateSalidaReal) / 60000);
                    flagsFaltasOretardos.push(`Salida Temp (${minSalidaAnticipada} min)`);
                    acumuladoMinutosFaltantes += minSalidaAnticipada;
                }

                // Definición de Estatus Global de la Jornada Fija
                if (acumuladoMinutosFaltantes > 0) {
                    diferencia = Number((-(acumuladoMinutosFaltantes / 60)).toFixed(2));
                    estatusLabel = flagsFaltasOretardos.join(" | ");
                    colorJornada = "danger";
                } else if (tsSalida && dateSalidaReal > dateSalidaTeorica) {
                    diferencia = Number(((dateSalidaReal - dateSalidaTeorica) / 3600000).toFixed(2));
                    estatusLabel = `Extra (${diferencia.toFixed(2)} hrs)`;
                    colorJornada = "success";
                } else {
                    diferencia = 0;
                    estatusLabel = "A tiempo";
                    colorJornada = "success";
                }
            }
        } else {
            jornadaAsignadaCalculo = asist.jornada_efectiva || 9.5;
            diferencia = Number((-jornadaAsignadaCalculo).toFixed(2));
            estatusLabel = "Faltante";
            colorJornada = "danger";
        }

        reporteMap[userId].total_horas += horasEfectivas;
        if (diferencia > 0) reporteMap[userId].extras += diferencia;
        else if (diferencia < 0) reporteMap[userId].faltantes += Math.abs(diferencia);        

        reporteMap[userId].asistencias.push({
            fecha_registro: asist.fecha, 
            entrada: infoEntrada,       
            salida: infoSalida,         
            comidas_registradas: comidasRegistradas, 
            total_efectivo: horasEfectivas > 0 ? Number(horasEfectivas.toFixed(2)) : null,
            jornada_asignada: Number(jornadaAsignadaCalculo.toFixed(2)),
            estatus: estatusLabel,
            color: colorJornada
        });
    }

    return Object.values(reporteMap).map(emp => ({
        ...emp,
        total_horas: emp.total_horas > 0 ? Number(emp.total_horas.toFixed(2)) : null,
        extras: Number(emp.extras.toFixed(2)),
        faltantes: Number(emp.faltantes.toFixed(2))
    }));
};

const parseHoraADecimal = (horaStr) => {
    const [hrs, mins, secs] = horaStr.split(':').map(Number);
    return hrs + (mins / 60) + (secs / (secs ? 3600 : 1)); 
};

const generarPdfReporte = async (empleados, periodo, id_tienda, id_empresa) => {
    const db = admin.firestore();
    
    let nombreEmpresa = 'ARAGOBEL';
    let nombreTienda = 'Sucursal';

    try {
        // Disparamos ambas promesas en paralelo para ahorrar la mitad del tiempo de espera
        const [empresaDoc, tiendaDoc] = await Promise.all([
            id_empresa ? db.collection('empresas').doc(id_empresa).get() : null,
            id_tienda ? db.collection('tiendas').doc(id_tienda).get() : null
        ]);

        // Asignamos los nombres directamente si los documentos existen
        if (empresaDoc?.exists) nombreEmpresa = empresaDoc.data().nombre || nombreEmpresa;
        if (tiendaDoc?.exists) nombreTienda = tiendaDoc.data().nombre || nombreTienda;

    } catch (error) {
        console.error('Error al traer contexto dinámico para el PDF:', error);
    }

    // 1. Construimos el encabezado del PDF
    const contenidoPdf = [
        { text: `REPORTE DE ASISTENCIAS`, style: 'headerTitle' },
        { text: `Empresa: ${nombreEmpresa}`, style: 'headerSubtitleStore' },
        { text: `Tienda: ${nombreTienda}`, style: 'headerSubtitleStore' },
        { text: `Periodo: ${periodo.inicio} al ${periodo.fin}`, style: 'headerSubtitleDates' }
    ];

    // 2. Mapeamos los datos de los empleados a la estructura de pdfmake
    empleados.forEach(emp => {
        // Validamos si las horas totales son nulas o válidas
        const totalHorasTxt = emp.total_horas !== null ? `${emp.total_horas} hrs` : 'N/A';

        contenidoPdf.push({ text: `Empleado: ${emp.nombre}`, style: 'empName' });
        contenidoPdf.push({ 
            text: `Horas Totales: ${totalHorasTxt}  |  Extras: ${emp.extras} hrs  |  Faltantes: ${emp.faltantes} hrs`, 
            style: 'empMeta' 
        });

        const tablaAsistencias = {
            table: {
                headerRows: 1,
                widths: ['auto', '*', '*', '*', '*', 'auto', '*'], // Ajuste de proporciones para fechas y horas
                body: [
                    [
                        { text: 'Fecha Reg.', style: 'tableHeader' },
                        { text: 'Entrada', style: 'tableHeader' },
                        { text: 'S. Comer', style: 'tableHeader' },
                        { text: 'R. Comer', style: 'tableHeader' },
                        { text: 'Salida', style: 'tableHeader' },
                        { text: 'Total Efectivo', style: 'tableHeader' },
                        { text: 'Estatus', style: 'tableHeader' }
                    ]
                ]
            },
            layout: 'lightHorizontalLines'
        };

        emp.asistencias.forEach(asist => {
            // --- FORMATEO DE ENTRADA ---
            let entradaCelda = "N/A";
            if (asist.entrada && asist.entrada.hora !== "N/A") {
                // Si la fecha de la checada coincide con el día del registro ponemos solo hora, si varía añadimos la fecha abajo
                entradaCelda = asist.entrada.fecha !== asist.fecha_registro 
                    ? `${asist.entrada.hora}\n(${asist.entrada.fecha})`
                    : asist.entrada.hora;
            }

            // --- FORMATEO DE SALIDA ---
            let salidaCelda = "N/A";
            if (asist.salida && asist.salida.hora !== "N/A") {
                salidaCelda = (asist.salida.hora !== "EN CURSO..." && asist.salida.fecha !== asist.fecha_registro)
                    ? `${asist.salida.hora}\n(${asist.salida.fecha})`
                    : asist.salida.hora;
            }

            // --- MANEJO MULTI-COMIDAS PARA LAS COLUMNAS S.COMER Y R.COMER ---
            let salidasComerArr = [];
            let regresosComerArr = [];

            if (asist.comidas_registradas && asist.comidas_registradas.length > 0) {
                asist.comidas_registradas.forEach(comida => {
                    // Procesar la salida a comer de este ciclo
                    if (comida.salida_comer && comida.salida_comer.hora !== "N/A") {
                        const txtSalida = comida.salida_comer.fecha !== asist.fecha_registro
                            ? `${comida.salida_comer.hora} (${comida.salida_comer.fecha})`
                            : comida.salida_comer.hora;
                        salidasComerArr.push(txtSalida);
                    }

                    // Procesar el regreso de comer de este ciclo
                    if (comida.regreso_comer && comida.regreso_comer.hora !== "N/A") {
                        const txtRegreso = (comida.regreso_comer.hora !== "EN COMIDA..." && comida.regreso_comer.fecha !== asist.fecha_registro)
                            ? `${comida.regreso_comer.hora} (${comida.regreso_comer.fecha})`
                            : comida.regreso_comer.hora;
                        regresosComerArr.push(txtRegreso);
                    }
                });
            }

            // Si no se registraron comidas en absoluto, mostramos el clásico "N/A"
            const sComerCelda = salidasComerArr.length > 0 ? salidasComerArr.join('\n') : "N/A";
            const rComerCelda = regresosComerArr.length > 0 ? regresosComerArr.join('\n') : "N/A";

            // Control de texto para el Total Efectivo
            const totalEfectivoTxt = asist.total_efectivo !== null ? `${asist.total_efectivo} hrs` : 'N/A';

            // Inyectamos la fila procesada a la estructura de la tabla
            tablaAsistencias.table.body.push([
                { text: asist.fecha_registro, style: 'tableBody' },
                { text: entradaCelda, style: 'tableBody' },
                { text: sComerCelda, style: 'tableBodyComida' },  // Estilo ajustado para multi-comidas
                { text: rComerCelda, style: 'tableBodyComida' },  // Estilo ajustado para multi-comidas
                { text: salidaCelda, style: 'tableBody' },
                { text: totalEfectivoTxt, style: 'tableBody' },
                { text: asist.estatus, style: 'tableBody' }
            ]);
        });

        contenidoPdf.push(tablaAsistencias);
    });

    const estilosAsistencia = {
        headerTitle: { fontSize: 16, bold: true, margin: [0, 0, 0, 5], alignment: 'center' },
        headerSubtitleStore: { fontSize: 10, margin: [0, 2, 0, 2] },
        headerSubtitleDates: { fontSize: 10, color: '#444', margin: [0, 2, 0, 15] },
        empName: { fontSize: 11, bold: true, margin: [0, 15, 0, 3] },
        empMeta: { fontSize: 9, color: '#555', margin: [0, 0, 0, 8] },
        tableHeader: { fontSize: 8, bold: true, fillColor: '#eeeeee', alignment: 'center', margin: [0, 4, 0, 4] },
        tableBody: { fontSize: 7.5, alignment: 'center', margin: [0, 3, 0, 3] },
        tableBodyComida: { fontSize: 7, alignment: 'center', margin: [0, 2, 0, 2] } // Un poco más pequeño por si se listan 2 o más comidas
    };

    // Generamos y retornamos el Buffer final del PDF utilizando tu manejador pdfMake
    return await pdfGenerator.createReporteBuffer(contenidoPdf, estilosAsistencia);
};

module.exports = { getAll, getById, create, update, remove, getReporteHoras, generarPdfReporte };