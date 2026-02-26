const aplicacionService = require('../services/aplicacionService');

const getAplicaciones = async (req, res) => {
    try {
        const aplicaciones = await aplicacionService.getAll();
        res.status(200).json(aplicaciones);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener aplicaciones', error: error.message });
    }
};

const getAplicacionById = async (req, res) => {
    const aplicacion = await aplicacionService.getById(req.params.id);
    aplicacion ? res.json(aplicacion) : res.status(404).json({ error: 'Aplicacion no encontrado' });
};

const createAplicacion = async (req, res) => {
    try {
        const nuevoAplicacion = await aplicacionService.create(req.body);
        res.status(201).json(nuevoAplicacion);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const updateAplicacion = async (req, res) => {
    const actualizado = await aplicacionService.update(req.params.id, req.body);
    actualizado ? res.json(actualizado) : res.status(404).json({ error: 'No se pudo actualizar' });
};

const deleteAplicacion = async (req, res) => {
    const eliminado = await aplicacionService.remove(req.params.id);
    eliminado ? res.json({ mensaje: 'Aplicacion eliminado' }) : res.status(404).json({ error: 'Aplicacion no encontrado' });
};

module.exports = { getAplicaciones, getAplicacionById, createAplicacion, updateAplicacion, deleteAplicacion };