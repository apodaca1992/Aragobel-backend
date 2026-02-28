const tiendaService = require('../services/tiendaService');
const catchAsync = require('../utils/catchAsync');

exports.getTiendas = catchAsync(async (req, res, next) => {
    const tiendas = await tiendaService.getAll();
    return res.status(200).json({
        length: tiendas.length,
        data: tiendas
    });
});

exports.getTiendaById = catchAsync(async (req, res, next) => {
    const tienda = await tiendaService.getById(req.params.id);
    tienda ? res.json(tienda) : res.status(404).json({ error: 'Tienda no encontrada' });
});

exports.createTienda = catchAsync(async (req, res, next) => {
    const nuevaTienda = await tiendaService.create(req.body);
    res.status(201).json(nuevaTienda);    
});

exports.updateTienda = catchAsync(async (req, res, next) => {
    const actualizada = await tiendaService.update(req.params.id, req.body);
    actualizada ? res.json(actualizada) : res.status(404).json({ error: 'No se pudo actualizar' });
});

exports.deleteTienda = catchAsync(async (req, res, next) => {
    const eliminado = await tiendaService.remove(req.params.id);
    eliminado ? res.json({ mensaje: 'Tienda eliminada' }) : res.status(404).json({ error: 'Tienda no encontrada' });
});
