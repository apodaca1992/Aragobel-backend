const { Rol } = require('../models');


const getAll = async () => await Rol.findAll({
        where: { activo: true } // Filtro explícito (Compatible con Firestore)
});

const getById = async (id) => await Rol.findByPk(id);

const create = async (data) => await Rol.create(data);

const update = async (id, data) => {
    const rol = await Rol.findByPk(id);
    if (!rol) return null;
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