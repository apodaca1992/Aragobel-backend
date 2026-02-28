const aplicacionService = require('../services/aplicacionService');
const catchAsync = require('../utils/catchAsync');

exports.getAplicaciones = catchAsync(async (req, res, next) => {
    const aplicaciones = await aplicacionService.getAll();
    return res.status(200).json({
        length: aplicaciones.length,
        data: aplicaciones
    });
});

exports.getAplicacionById = catchAsync(async (req, res, next) => {
    const aplicacion = await aplicacionService.getById(req.params.id);
    aplicacion ? res.json(aplicacion) : res.status(404).json({ error: 'Aplicacion no encontrado' });
});

exports.createAplicacion = catchAsync(async (req, res, next) => {
    const nuevoAplicacion = await aplicacionService.create(req.body);
    res.status(201).json(nuevoAplicacion);
});

exports.updateAplicacion = catchAsync(async (req, res, next) => {
    const actualizado = await aplicacionService.update(req.params.id, req.body);
    actualizado ? res.json(actualizado) : res.status(404).json({ error: 'No se pudo actualizar' });
});

exports.deleteAplicacion = catchAsync(async (req, res, next) => {
    const eliminado = await aplicacionService.remove(req.params.id);
    eliminado ? res.json({ mensaje: 'Aplicacion eliminado' }) : res.status(404).json({ error: 'Aplicacion no encontrado' });
});