const Firestore = require('../utils/firestoreUtils'); // Importamos el objeto completo
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const { admin } = require('../../config/firebase');

const getAll = async (opciones = {}) => await Firestore.findAll('tiendas',opciones);
   
const getById = async (id,user) => {

    const tiendaExistente = await Firestore.findByPk('tiendas',id);

    if (!tiendaExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`La tienda '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    // Validación de pertenencia
    if (tiendaExistente.id_empresa !== user.id_empresa) {
        logger.warn(`Intento para acceso NO AUTORIZADO: Usuario ${user.id} intentó obtener la tienda ${id}`);
        throw new AppError('No tienes permiso para acceder a esta tienda', 403);
    }

    return tiendaExistente;
}

const create = async (data) => { 
    // Convertimos la ubicación a GeoPoint nativo en la misma propiedad
    data.ubicacion = new admin.firestore.GeoPoint(
        parseFloat(data.ubicacion.lat), 
        parseFloat(data.ubicacion.lng)
    );
    return await Firestore.create('tiendas',data);
}

const update = async (id, data, user) => {
    const tiendaExistente = await Firestore.findByPk('tiendas',id);
    if (!tiendaExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`La tienda '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    // 2. Validar que la tienda le pertenezca a la empresa del usuario
    if (tiendaExistente.id_empresa !== user.id_empresa) {
        logger.warn(`Intento de edición NO AUTORIZADO: Usuario ${user.id} intentó editar tienda ${id}`);
        throw new AppError('No tienes permiso para editar esta tienda', 403);
    }

    const resultadoUpdate = await Firestore.update('tiendas',id,data);

    return {
        ...tiendaExistente, // Trae id, activo, createdAt, etc.
        ...resultadoUpdate  // Sobrescribe los campos cambiados y trae el nuevo updatedAt
    };
};

const remove = async (id, user) => {
    const tiendaExistente = await Firestore.findByPk('tiendas',id);
    if (!tiendaExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`La tienda '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    // Validación de pertenencia
    if (tiendaExistente.id_empresa !== user.id_empresa) {
        logger.warn(`Intento para eliminación NO AUTORIZADO: Usuario ${user.id} intentó borrar la tienda ${id}`);
        throw new AppError('No tienes permiso para borrar a esta tienda', 403);
    }

    const resultadoSoftDelete= await Firestore.softDelete('tiendas',id);

    return {
        ...tiendaExistente, // Trae id, activo, createdAt, etc.
        ...resultadoSoftDelete  // Sobrescribe los campos cambiados y trae el nuevo updatedAt
    };
};

module.exports = { getAll, getById, create, update, remove };