const tiendaService = require('../services/tiendaService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getTiendas = catchAsync(async (req, res, next) => {
    const tiendas = await tiendaService.getAll();
    return res.status(200).json({
        length: tiendas.length,
        data: tiendas
    });
});

exports.getTiendaById = catchAsync(async (req, res, next) => {
    const tienda = await tiendaService.getById(req.params.id);

    if (!tienda) {
        return next(new AppError('No se pudo encontrar', 404));
    }

    return res.status(200).json({
        data: tienda
    });
});

exports.createTienda = catchAsync(async (req, res, next) => {
    const nuevaTienda = await tiendaService.create(req.body);
    return res.status(201).json(nuevaTienda);    
});

exports.updateTienda = catchAsync(async (req, res, next) => {
    const actualizado = await tiendaService.update(req.params.id, req.body);

    if (!actualizado) {
        return next(new AppError('No se pudo actualizar', 404));
    }

    return res.status(200).json({
        data: actualizado
    });
});

exports.deleteTienda = catchAsync(async (req, res, next) => {
    const eliminado = await tiendaService.remove(req.params.id);

    if (!eliminado) {
        return next(new AppError('No se pudo eliminar', 404));
    }

    return res.status(200).json({
        message: 'Se elimino correctamente'
    });
});
