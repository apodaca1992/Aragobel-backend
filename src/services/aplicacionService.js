const { Aplicacion } = require('../models');

const getAll = async () => await Aplicacion.findAll({
        where: { activo: true } // Filtro explícito (Compatible con Firestore)
});

const getById = async (id) => await Aplicacion.findByPk(id);

const create = async (data) => await Aplicacion.create(data);

const update = async (id, data) => {
    const aplicacion = await Aplicacion.findByPk(id);
    if (!aplicacion) return null;

    return await aplicacion.update(data);
};

const remove = async (id) => {
    const aplicacion = await Aplicacion.findByPk(id);
    if (!aplicacion) return null;
    await aplicacion.update(
        { 
            activo: false,
            deletedAt: new Date() 
        }
    );
    return true;
};

module.exports = { getAll, getById, create, update, remove };