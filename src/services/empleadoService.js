const { Empleado } = require('../models');
const { Op } = require('sequelize');
const AppError = require('../utils/appError');

const getAll = async () => await Empleado.findAll({
        where: { activo: true } // Filtro explícito (Compatible con Firestore)
});

const getById = async (id) => await Empleado.findByPk(id);

const create = async (data) => {
    // 1. Normalización (Por si acaso el middleware no lo hizo)
    const emailNormalizado = data.email.toLowerCase().trim();

    // 2. Check de Unicidad
    const existe = await Empleado.findOne({ where: { email: emailNormalizado } });
    if (existe) {
        const error = new AppError(`El email '${emailNormalizado}' ya está registrado.`);
        error.statusCode = 400;
        throw error;
    }

    // 3. Crear
    return await Empleado.create({ ...data, email: emailNormalizado });
}

const update = async (id, data) => {
    // 1. Check de Existencia (Lo que mencionamos antes)
    const empleado = await Empleado.findByPk(id);
    if (!empleado) {
        const error = new AppError('Empleado no encontrado');
        error.statusCode = 404;
        throw error;
    }

    // 2. Check de Unicidad del Email (Solo si el email viene en el update)
    if (data.email) {
        const emailNormalizado = data.email.toLowerCase().trim();
        
        const existeOtro = await Empleado.findOne({
            where: {
                email: emailNormalizado,
                id_empleado: { [Op.ne]: id } // Que no sea el mismo que estamos editando
            }
        });

        if (existeOtro) {
            const error = new AppError(`El email '${emailNormalizado}' ya pertenece a otro empleado.`);
            error.statusCode = 400;
            throw error;
        }
        data.email = emailNormalizado;
    }

    return await empleado.update(data);
};

const remove = async (id) => {
    const empleado = await Empleado.findByPk(id);
    if (!empleado) return null;
    await empleado.update(
        { 
            activo: false,
            deletedAt: new Date() 
        }
    );
    return true;
};

module.exports = { getAll, getById, create, update, remove };