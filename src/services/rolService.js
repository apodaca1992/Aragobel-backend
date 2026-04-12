const Firestore = require('../utils/firestoreUtils'); // Importamos el objeto completo

const AppError = require('../utils/appError');

const getAll = async (opciones = {}) => await Firestore.findAll('roles',opciones);
   
const getById = async (id) => await Firestore.findByPk('roles',id);

const create = async (data) => {
    // 1. Normalización Manual (Mayúsculas y sin espacios)
    const nombreNormalizado = data.nombre.toUpperCase().trim();

    const rolExistente = await Firestore.findByPk('roles', nombreNormalizado);

    if (rolExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`El rol '${nombreNormalizado}' ya existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    return await Firestore.create('roles',{
        ...data,
        permisos: data.permisos || {}}
    ,nombreNormalizado);
    
}

const update = async (id, data) => {
    const rolExistente = await Firestore.findByPk('roles',id);
    if (!rolExistente) {
        const error = new AppError(`No se encontró el rol con ID: ${id}`);
        error.statusCode = 404; // Not Found
        throw error;
    }
    return await Firestore.update('roles',id,data);
};

const remove = async (id) => {
    const rol = await Firestore.findByPk('roles',id);
    if (!rol) return null;

    const resultadoSoftDelete= await Firestore.softDelete('roles',id);

    return {
        ...rol, // Trae id, activo, createdAt, etc.
        ...resultadoSoftDelete  // Sobrescribe los campos cambiados y trae el nuevo updatedAt
    };
};

module.exports = { getAll, getById, create, update, remove };