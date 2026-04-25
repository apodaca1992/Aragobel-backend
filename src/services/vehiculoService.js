const Firestore = require('../utils/firestoreUtils'); // Importamos el objeto completo
const AppError = require('../utils/appError');

const getAll = async (opciones = {}) => await Firestore.findAll('vehiculos',opciones);
   
const getById = async (id) => {

    const vehiculoExistente = await Firestore.findByPk('vehiculos',id);

    if (!vehiculoExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`El vehiculo '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    return vehiculoExistente;
}

const create = async (data) => await Firestore.create('vehiculos',data);

const update = async (id, data) => {
    const vehiculoExistente = await Firestore.findByPk('vehiculos',id);
    if (!vehiculoExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`El vehiculo '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    const resultadoUpdate = await Firestore.update('vehiculos',id,data);

    return {
        ...vehiculoExistente, // Trae id, activo, createdAt, etc.
        ...resultadoUpdate  // Sobrescribe los campos cambiados y trae el nuevo updatedAt
    };
};

const remove = async (id) => {
    const vehiculoExistente = await Firestore.findByPk('vehiculos',id);
    if (!vehiculoExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`El vehiculo '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    const resultadoSoftDelete= await Firestore.softDelete('vehiculos',id);

    return {
        ...vehiculoExistente, // Trae id, activo, createdAt, etc.
        ...resultadoSoftDelete  // Sobrescribe los campos cambiados y trae el nuevo updatedAt
    };
};

module.exports = { getAll, getById, create, update, remove };