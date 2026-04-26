const Firestore = require('../utils/firestoreUtils'); // Importamos el objeto completo
const { admin } = require('../../config/firebase');
const AppError = require('../utils/appError');

const getAll = async (opciones = {}) => await Firestore.findAll('asistencias',opciones);
   
const getById = async (id) => {

    const asistenciaExistente = await Firestore.findByPk('asistencias',id);

    if (!asistenciaExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`La asistencia '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
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

const update = async (id, data) => {
    const asistenciaExistente = await Firestore.findByPk('asistencias',id);
    if (!asistenciaExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`La asistencia '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    const resultadoUpdate = await Firestore.update('asistencias',id,data);

    return {
        ...asistenciaExistente, // Trae id, activo, createdAt, etc.
        ...resultadoUpdate  // Sobrescribe los campos cambiados y trae el nuevo updatedAt
    };
};

const remove = async (id) => {
    const asistenciaExistente = await Firestore.findByPk('asistencias',id);
    if (!asistenciaExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`La asistencia '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    const resultadoSoftDelete= await Firestore.softDelete('asistencias',id);

    return {
        ...asistenciaExistente, // Trae id, activo, createdAt, etc.
        ...resultadoSoftDelete  // Sobrescribe los campos cambiados y trae el nuevo updatedAt
    };
};

module.exports = { getAll, getById, create, update, remove };