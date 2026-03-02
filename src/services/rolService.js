const { Rol } = require('../models');
const { Op } = require('sequelize');
const AppError = require('../utils/appError');


const getAll = async () => await Rol.findAll({
        where: { activo: true } // Filtro explícito (Compatible con Firestore)
});

const getById = async (id) => await Rol.findByPk(id);

const create = async (data) => {
    // 1. Normalización Manual (Mayúsculas y sin espacios)
    const nombreNormalizado = data.nombre.toUpperCase().trim();

    const rolExistente = await Rol.findOne({ 
        where: { nombre: nombreNormalizado } 
    });

    if (rolExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`El rol '${nombreNormalizado}' ya existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    return await Rol.create({
        ...data,
        nombre: nombreNormalizado, 
        permisos: data.permisos || {}});
}

const update = async (id, data) => {
    const rol = await Rol.findByPk(id);
    if (!rol) {
        const error = new AppError(`No se encontró el rol con ID: ${id}`);
        error.statusCode = 404; // Not Found
        throw error;
    }

    if (data.nombre) {
        const nombreNormalizado = data.nombre.toUpperCase().trim();
        
        // SEGUNDO CHECK: ¿El nuevo nombre ya lo tiene OTRO rol?
        const existeOtro = await Rol.findOne({
            where: { 
                nombre: nombreNormalizado,
                id_rol: { [Op.ne]: id } // "Not Equal" al que estoy editando
            }
        });

        if (existeOtro) {
            const error = new AppError(`El nombre '${nombreNormalizado}' ya está en uso por otro rol.`);
            error.statusCode = 400; // Bad Request
            throw error;
        }
        
        // Si pasó la validación, actualizamos el dato normalizado
        data.nombre = nombreNormalizado;
    }
    return await rol.update(data);
};

const remove = async (id) => {
    const rol = await Rol.findByPk(id);
    if (!rol) return null;
    await rol.update(
        { 
            activo: false,
            deletedAt: new Date() 
        }
    );
    return true;
};

module.exports = { getAll, getById, create, update, remove };