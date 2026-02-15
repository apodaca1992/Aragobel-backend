const Tienda = require('../models/Tienda');

const getAllTiendas = async () => {
    // Es el equivalente a un findAll() en Spring Data JPA
    return await Tienda.findAll();
};

const getTiendaById = async (id) => {
    return await Tienda.findByPk(id);
};

const createTienda = async (datos) => {
    return await Tienda.create(datos);
};

module.exports = { getAllTiendas, getTiendaById, createTienda };