const { Recurso, Aplicacion } = require('../models');

const getAll = async () => await Recurso.findAll({
        where: { activo: true } // Filtro explícito (Compatible con Firestore)
});

const getById = async (id) => {
    const recurso = await Recurso.findByPk(id);
    if (!recurso) return null;
    const aplicacion = await Aplicacion.findByPk(recurso.id_aplicacion);
    return {
        ...recurso.get({ plain: true }), 
        aplicacion
    };
};

const create = async (data) => await Recurso.create(data);

const update = async (id, data) => {
    const recurso = await Recurso.findByPk(id);
    if (!recurso) return null;

    return await recurso.update(data);
};

const remove = async (id) => {
    const recurso = await Recurso.findByPk(id);
    if (!recurso) return null;
    await recurso.update(
        { 
            activo: false,
            deletedAt: new Date() 
        }
    );
    return true;
};

module.exports = { getAll, getById, create, update, remove };