const Firestore = require('../utils/firestoreUtils'); // Importamos el objeto completo
const cryptoUtils = require('../utils/cryptoUtils');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const { admin } = require('../../config/firebase');

const getAll = async (opciones = {}) => await Firestore.findAll('usuarios',opciones);
   
const getById = async (id,user) => {

    const usuarioExistente = await Firestore.findByPk('usuarios',id);

    if (!usuarioExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`El usuario '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    // Validación de pertenencia
    if (usuarioExistente.id_empresa !== user.id_empresa) {
        logger.warn(`Intento para acceso NO AUTORIZADO: Usuario ${user.id} intentó obtener la usuario ${id}`);
        throw new AppError('No tienes permiso para acceder a esta usuario', 403);
    }

    return usuarioExistente;
}

const create = async (datos) => { 
     // 1. Verificar si el nombre de usuario ya existe
    const usuarioExistente = await Firestore.findOne('usuarios', 'usuario', datos.usuario);
    if (usuarioExistente) {
        logger.warn(`El nombre de usuario ya está en uso (${datos.usuario})`);
        throw new AppError('El nombre de usuario ya está en uso', 400);
    }

    /*// 2. Verificar si el email ya existe
    const emailExistente = await Firestore.findOne('usuarios', 'email', datos.email);
    if (emailExistente) {
        logger.warn(`El correo electrónico ya está registrado (${datos.email})`);
        throw new AppError('El correo electrónico ya está registrado', 400);
    }*/

    const hash = await cryptoUtils.hashPassword(datos.contrasena);
    return await Firestore.create('usuarios', {
        ...datos,
        contrasena: hash
    });
}

const update = async (id, data, user) => {
    const usuarioExistente = await Firestore.findByPk('usuarios',id);
    if (!usuarioExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`El usuario '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    // 2. Validar que la usuario le pertenezca a la empresa del usuario
    if (usuarioExistente.id_empresa !== user.id_empresa) {
        logger.warn(`Intento de edición NO AUTORIZADO: Usuario ${user.id} intentó editar usuario ${id}`);
        throw new AppError('No tienes permiso para editar el usuario', 403);
    }

    const resultadoUpdate = await Firestore.update('usuarios',id,data);

    return {
        ...usuarioExistente, // Trae id, activo, createdAt, etc.
        ...resultadoUpdate  // Sobrescribe los campos cambiados y trae el nuevo updatedAt
    };
};

const remove = async (id, user) => {
    const usuarioExistente = await Firestore.findByPk('usuarios',id);
    if (!usuarioExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`El usuario '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    // Validación de pertenencia
    if (usuarioExistente.id_empresa !== user.id_empresa) {
        logger.warn(`Intento para eliminación NO AUTORIZADO: Usuario ${user.id} intentó borrar la usuario ${id}`);
        throw new AppError('No tienes permiso para borrar a este usuario', 403);
    }

    const resultadoSoftDelete= await Firestore.softDelete('usuarios',id);

    return {
        ...usuarioExistente, // Trae id, activo, createdAt, etc.
        ...resultadoSoftDelete  // Sobrescribe los campos cambiados y trae el nuevo updatedAt
    };
};

module.exports = { getAll, getById, create, update, remove };