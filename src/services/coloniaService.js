const Firestore = require('../utils/firestoreUtils'); // Importamos el objeto completo
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

const getAll = async (opciones = {}) => await Firestore.findAll('colonias',opciones);
   
const getById = async (id,user) => {

    const coloniaExistente = await Firestore.findByPk('colonias',id);

    if (!coloniaExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`La colonia '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    // Validación de pertenencia
    if (coloniaExistente.id_empresa !== user.id_empresa) {
        logger.warn(`Intento para acceso NO AUTORIZADO: Usuario ${user.id} intentó obtener la colonia ${id}`);
        throw new AppError('No tienes permiso para acceder a esta colonia', 403);
    }

    return coloniaExistente;
}

const create = async (data) => await Firestore.create('colonias',data);

const update = async (id, data, user) => {
    const permitirInactivos = data && data.activo === 1;

    // Pasamos dinámicamente el resultado de nuestra condición (true o false)
    const registroExistente = await Firestore.findByPk('colonias', id, permitirInactivos);
    
    if (!registroExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`La colonia '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    // 2. Validar que la tienda le pertenezca a la empresa del usuario
    if (registroExistente.id_empresa !== user.id_empresa) {
        logger.warn(`Intento de edición NO AUTORIZADO: Usuario ${user.id} intentó editar la colonia ${id}`);
        throw new AppError('No tienes permiso para editar esta colonia', 403);
    }

    const resultadoUpdate = await Firestore.update('colonias',id,data);

    return {
        ...registroExistente, // Trae id, activo, createdAt, etc.
        ...resultadoUpdate  // Sobrescribe los campos cambiados y trae el nuevo updatedAt
    };
};

const remove = async (id, user) => {
    const coloniaExistente = await Firestore.findByPk('colonias',id);
    if (!coloniaExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`La colonia '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    // Validación de pertenencia
    if (coloniaExistente.id_empresa !== user.id_empresa) {
        logger.warn(`Intento para eliminación NO AUTORIZADO: Usuario ${user.id} intentó borrar la colonia ${id}`);
        throw new AppError('No tienes permiso para borrar a esta colonia', 403);
    }

    const resultadoSoftDelete= await Firestore.softDelete('colonias',id);

    return {
        ...coloniaExistente, // Trae id, activo, createdAt, etc.
        ...resultadoSoftDelete  // Sobrescribe los campos cambiados y trae el nuevo updatedAt
    };
};

module.exports = { getAll, getById, create, update, remove };