const Firestore = require('../utils/firestoreUtils'); // Importamos el objeto completo
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

const getAll = async (opciones = {}) => await Firestore.findAll('vehiculos',opciones);
   
const getById = async (id,user) => {

    const vehiculoExistente = await Firestore.findByPk('vehiculos',id);

    if (!vehiculoExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`El vehiculo '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    // Validación de pertenencia
    if (vehiculoExistente.id_empresa !== user.id_empresa) {
        logger.warn(`Intento para acceso NO AUTORIZADO: Usuario ${user.id} intentó obtener el vehiculo ${id}`);
        throw new AppError('No tienes permiso para acceder a este vehiculo', 403);
    }

    return vehiculoExistente;
}

const create = async (data) => await Firestore.create('vehiculos',data);

const update = async (id, data, user) => {
    const vehiculoExistente = await Firestore.findByPk('vehiculos',id);
    if (!vehiculoExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`El vehiculo '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    // 2. Validar que la tienda le pertenezca a la empresa del usuario
    if (vehiculoExistente.id_empresa !== user.id_empresa) {
        logger.warn(`Intento de edición NO AUTORIZADO: Usuario ${user.id} intentó editar el vehiculo ${id}`);
        throw new AppError('No tienes permiso para editar este vehiculo', 403);
    }

    const resultadoUpdate = await Firestore.update('vehiculos',id,data);

    return {
        ...vehiculoExistente, // Trae id, activo, createdAt, etc.
        ...resultadoUpdate  // Sobrescribe los campos cambiados y trae el nuevo updatedAt
    };
};

const remove = async (id, user) => {
    const vehiculoExistente = await Firestore.findByPk('vehiculos',id);
    if (!vehiculoExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`El vehiculo '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    // Validación de pertenencia
    if (vehiculoExistente.id_empresa !== user.id_empresa) {
        logger.warn(`Intento para eliminación NO AUTORIZADO: Usuario ${user.id} intentó borrar el vehiculo ${id}`);
        throw new AppError('No tienes permiso para borrar a este vehiculo', 403);
    }

    const resultadoSoftDelete= await Firestore.softDelete('vehiculos',id);

    return {
        ...vehiculoExistente, // Trae id, activo, createdAt, etc.
        ...resultadoSoftDelete  // Sobrescribe los campos cambiados y trae el nuevo updatedAt
    };
};

module.exports = { getAll, getById, create, update, remove };