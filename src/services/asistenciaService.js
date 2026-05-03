const Firestore = require('../utils/firestoreUtils'); // Importamos el objeto completo
const { admin } = require('../../config/firebase');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

const getAll = async (opciones = {}) => {
    // 1. Extraemos los filtros de las opciones
    let { filtros = {} } = opciones;

    // 2. Lógica de Negocio: Si viene una fecha y es 'TODAY', inyectamos la fecha del servidor    
    // Esto garantiza que el cliente no tenga que calcularla
    if (filtros.fecha || filtros.fecha === 'TODAY') {
        filtros.fecha = new Date().toLocaleString("sv-SE", { 
            timeZone: "America/Mazatlan" 
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

    // 1. Obtener tiempo oficial de Mazatlán
    const now = new Date();
    const localTime = now.toLocaleString("sv-SE", { timeZone: "America/Mazatlan" });
    const [fecha, hora] = localTime.split(' ');

    // --- VALIDACIÓN DE DUPLICADOS ---
    // Buscamos si ya existe una asistencia para este usuario, este día y este tipo
    const registrosExistentes = await Firestore.findAll('asistencias', {
        filtros: {
            id_usuario: data.id_usuario,
            fecha: fecha,
            tipo: data.tipo.toUpperCase(),
            activo: 1 // IMPORTANTE: Para que tu findAll no use el default
        },
        limit: 1
    });

    if (registrosExistentes.length > 0) {
        throw new AppError(`Ya existe un registro de ${data.tipo} para hoy`, 400);
    }

    // 2. Definir estatus (Tolerancia de 10 min: 08:10:00)
    const horaEntradaOficial = "08:00:00";
    
    // Inyectamos directamente en el objeto 'data'
    data.fecha = fecha;
    data.hora = hora;
    data.estatus = (data.tipo === 'ENTRADA' && hora > horaEntradaOficial) ? "RETARDO" : "A_TIEMPO";
    
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