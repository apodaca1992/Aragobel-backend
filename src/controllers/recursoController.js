const recursoService = require('../services/recursoService');

const getRecursos = async (req, res) => {
    try {
        const recursos = await recursoService.getAll();
        res.status(200).json(recursos);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener recursos', error: error.message });
    }
};

const getRecursoById = async (req, res) => {
    const recurso = await recursoService.getById(req.params.id);
    recurso ? res.json(recurso) : res.status(404).json({ error: 'Recurso no encontrado' });
};

const createRecurso = async (req, res) => {
    try {
        const nuevoRecurso = await recursoService.create(req.body);
        res.status(201).json(nuevoRecurso);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const updateRecurso = async (req, res) => {
    const actualizado = await recursoService.update(req.params.id, req.body);
    actualizado ? res.json(actualizado) : res.status(404).json({ error: 'No se pudo actualizar' });
};

const deleteRecurso = async (req, res) => {
    const eliminado = await recursoService.remove(req.params.id);
    eliminado ? res.json({ mensaje: 'Recurso eliminado' }) : res.status(404).json({ error: 'Recurso no encontrado' });
};

module.exports = { getRecursos, getRecursoById, createRecurso, updateRecurso, deleteRecurso };