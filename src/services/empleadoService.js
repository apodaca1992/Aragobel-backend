const { Empleado } = require('../models');

const getAll = async () => await Empleado.findAll({
        where: { activo: true } // Filtro explícito (Compatible con Firestore)
});

const getById = async (id) => await Empleado.findByPk(id);

const create = async (data) => await Empleado.create(data);

const update = async (id, data) => {
    const empleado = await Empleado.findByPk(id);
    if (!empleado) return null;

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