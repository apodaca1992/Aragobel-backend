const tiendaService = require('../services/tiendaService');

const getTiendas = async (req, res) => {
    try {
        const tiendas = await tiendaService.getAll();
        res.status(200).json(tiendas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener tiendas', error: error.message });
    }
};

const getTiendaById = async (req, res) => {
    const tienda = await tiendaService.getById(req.params.id);
    tienda ? res.json(tienda) : res.status(404).json({ error: 'Tienda no encontrada' });
};

const createTienda = async (req, res) => {
    try {
        const nuevaTienda = await tiendaService.create(req.body);
        res.status(201).json(nuevaTienda);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const updateTienda = async (req, res) => {
    const actualizada = await tiendaService.update(req.params.id, req.body);
    actualizada ? res.json(actualizada) : res.status(404).json({ error: 'No se pudo actualizar' });
};

const deleteTienda = async (req, res) => {
    const eliminado = await tiendaService.remove(req.params.id);
    eliminado ? res.json({ mensaje: 'Tienda eliminada' }) : res.status(404).json({ error: 'Tienda no encontrada' });
};

module.exports = { getTiendas, getTiendaById, createTienda, updateTienda, deleteTienda };