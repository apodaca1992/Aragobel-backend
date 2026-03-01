const aplicacionService = require('../services/aplicacionService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

exports.getAplicaciones = catchAsync(async (req, res, next) => {
    const aplicaciones = await aplicacionService.getAll();
    return res.status(200).json({
        length: aplicaciones.length,
        data: aplicaciones
    });
});

exports.getAplicacionById = catchAsync(async (req, res, next) => {
    const aplicacion = await aplicacionService.getById(req.params.id);

    if (!aplicacion) {
        logger.warn(`Aplicación no encontrada`, { id, user: req.user?.id });
        return next(new AppError('No se pudo encontrar', 404));
    }

    return res.status(200).json({
        data: aplicacion
    });
});

exports.createAplicacion = catchAsync(async (req, res, next) => {
    const nuevoAplicacion = await aplicacionService.create(req.body);
    return res.status(201).json(nuevoAplicacion);
});

exports.updateAplicacion = catchAsync(async (req, res, next) => {
    const actualizado = await aplicacionService.update(req.params.id, req.body);

    if (!actualizado) {
        logger.warn(`Intento de actualización de la Aplicación fallido:`, { 
            id: req.params.id, 
            user: req.user?.id 
        });
        return next(new AppError('No se pudo actualizar', 404));
    }

    return res.status(200).json({
        data: actualizado
    });
});

exports.deleteAplicacion = catchAsync(async (req, res, next) => {
    const eliminado = await aplicacionService.remove(req.params.id);

    if (!eliminado) {
        logger.error(`Error crítico: Fallo al eliminar la Aplicación`, { 
            id: req.params.id, 
            user: req.user?.id 
        });
        return next(new AppError('No se pudo eliminar', 404));
    }

    return res.status(200).json({
        message: 'Se elimino correctamente'
    });
});