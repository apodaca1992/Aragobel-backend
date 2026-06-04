const Firestore = require('../utils/firestoreUtils'); // Importamos el objeto completo
const cryptoUtils = require('../utils/cryptoUtils');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const { db, admin } = require('../../config/firebase');

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
    if (!datos.usuario) throw new AppError('El nombre de usuario es obligatorio', 400);
    
    // Normalizamos a minúsculas y quitamos espacios para evitar "Admin" vs "admin"
    const usuarioClean = datos.usuario.trim().toLowerCase();

    // 1. Verificar si el nombre de usuario ya existe a nivel global (toda la colección)
    const usuarioExistente = await Firestore.findOne('usuarios', 'usuario', usuarioClean);
    if (usuarioExistente) {
        logger.warn(`El nombre de usuario ya está en uso (${usuarioClean})`);
        throw new AppError('El nombre de usuario ya está en uso', 400);
    }

    const hash = await cryptoUtils.hashPassword(datos.contrasena);
    return await Firestore.create('usuarios', {
        ...datos,
        contrasena: hash
    });
}

const update = async (id, data, user) => {
    const permitirInactivos = data && data.activo === 1;

    // Pasamos dinámicamente el resultado de nuestra condición (true o false)
    const registroExistente = await Firestore.findByPk('usuarios', id, permitirInactivos);
    
    if (!registroExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`El usuario '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    // 2. Validar que la usuario le pertenezca a la empresa del usuario
    if (registroExistente.id_empresa !== user.id_empresa) {
        logger.warn(`Intento de edición NO AUTORIZADO: Usuario ${user.id} intentó editar usuario ${id}`);
        throw new AppError('No tienes permiso para editar el usuario', 403);
    }

    // 2. NUEVA VALIDACIÓN GLOBAL DE USUARIO ÚNICO EN UPDATE
    if (data.usuario) {
        const usuarioClean = data.usuario.trim().toLowerCase();
        
        // Buscamos si el nuevo nombre de usuario ya le pertenece a ALGUIEN MÁS
        // Usamos la instancia db de Firestore directo para filtrar de manera óptima
        const snapshot = await db.collection('usuarios')
            .where('usuario', '==', usuarioClean)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const docEncontrado = snapshot.docs[0];
            // Si el documento encontrado NO es el mismo usuario que estamos editando, es un duplicado real
            if (docEncontrado.id !== id) {
                logger.warn(`Intento de duplicar nombre de usuario en update: ${usuarioClean} por el usuario ${id}`);
                throw new AppError('El nombre de usuario ya está en uso por otra cuenta', 400);
            }
        }
        
        // Guardamos la mutación limpia
        data.usuario = usuarioClean;
    }

    // Si viene cambio de contraseña en el update, lo hasheamos de una vez
    if (data.contrasena) {
        data.contrasena = await cryptoUtils.hashPassword(data.contrasena);
    }

    const resultadoUpdate = await Firestore.update('usuarios',id,data);

    return {
        ...registroExistente, // Trae id, activo, createdAt, etc.
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