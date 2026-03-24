const { Tienda } = require('../models');
const Firestore = require('../utils/firestoreUtils'); // Importamos el objeto completo

const getAll = async (opciones = {}) => await Firestore.findAll('tiendas',opciones);
   
const getById = async (id) => await Firestore.findByPk('tiendas',id);

const create = async (data) => await Firestore.create('tiendas',data);

const update = async (id, data) => {
    const tiendaExistente = await Firestore.findByPk('tiendas',id);
    if (!tiendaExistente) return null;

    const resultadoUpdate = await Firestore.update('tiendas',id,data);

    return {
        ...tiendaExistente, // Trae id, activo, createdAt, etc.
        ...resultadoUpdate  // Sobrescribe los campos cambiados y trae el nuevo updatedAt
    };
};

const remove = async (id) => {
    const tiendaExistente = await Firestore.findByPk('tiendas',id);
    if (!tiendaExistente) return null;

    const resultadoSoftDelete= await Firestore.softDelete('tiendas',id);

    return {
        ...tiendaExistente, // Trae id, activo, createdAt, etc.
        ...resultadoSoftDelete  // Sobrescribe los campos cambiados y trae el nuevo updatedAt
    };
};

module.exports = { getAll, getById, create, update, remove };