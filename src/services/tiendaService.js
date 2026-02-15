const Tienda = require('../models/Tienda');

const getAll = async () => await Tienda.findAll();

const getById = async (id) => await Tienda.findByPk(id);

const create = async (data) => await Tienda.create(data);

const update = async (id, data) => {
    const tienda = await Tienda.findByPk(id);
    if (!tienda) return null;
    return await tienda.update(data);
};

const remove = async (id) => {
    const tienda = await Tienda.findByPk(id);
    if (!tienda) return null;
    await tienda.destroy();
    return true;
};

module.exports = { getAll, getById, create, update, remove };