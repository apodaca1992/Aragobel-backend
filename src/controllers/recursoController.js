const recursoService = require('../services/recursoService');
const catchAsync = require('../utils/catchAsync');

exports.getRecursos = catchAsync(async (req, res, next) => {
    const recursos = await recursoService.getAll();
    // Siempre retorna la respuesta para cerrar el ciclo
    return res.status(200).json({
        length: recursos.length,
        data: recursos
    });
});

exports.getRecursoById = catchAsync(async (req, res, next) => {
    const recurso = await recursoService.getById(req.params.id);
    recurso ? res.json(recurso) : res.status(404).json({ error: 'Recurso no encontrado' });
});

exports.createRecurso = catchAsync(async (req, res, next) => {
    const nuevoRecurso = await recursoService.create(req.body);
    res.status(201).json(nuevoRecurso);    
});

exports.updateRecurso = catchAsync(async (req, res, next) => {
    const actualizado = await recursoService.update(req.params.id, req.body);
    actualizado ? res.json(actualizado) : res.status(404).json({ error: 'No se pudo actualizar' });
});

exports.deleteRecurso = catchAsync(async (req, res, next) => {
    const eliminado = await recursoService.remove(req.params.id);
    eliminado ? res.json({ mensaje: 'Recurso eliminado' }) : res.status(404).json({ error: 'Recurso no encontrado' });
});