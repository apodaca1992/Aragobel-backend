const tiendaService = require('../services/tiendaService');

const getTiendas = async (req, res) => {
    try {
        const tiendas = await tiendaService.getAllTiendas();
        res.status(200).json(tiendas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener tiendas', error: error.message });
    }
};

module.exports = { getTiendas };