const entregaService = require('../services/entregaService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

exports.getEntregas = catchAsync(async (req, res, next) => {
    // 1. Extraemos los parámetros que vienen de Postman (?limit=5&zona=Norte)
    const { 
        limit, 
        lastDocId, 
        orderBy, 
        orderDir,
        ...filtros // Todo lo demás que no sea paginación se va a filtros
    } = req.query;
    
    // 2. Pasamos un objeto de opciones al servicio
    const entregas = await entregaService.getAll({
        limit, 
        lastDocId, 
        orderBy, 
        orderDir,
        filtros: { ...filtros, id_empresa: req.user.id_empresa }
    });
    return res.status(200).json({
        length: entregas.length,
        data: entregas
    });
});

exports.getEntregaById = catchAsync(async (req, res, next) => {
    const entrega = await entregaService.getById(req.params.id, req.user);

    if (!entrega) {
        logger.warn(`Entrega no encontrada`, { id, user: req.user?.id });
        return next(new AppError('No se pudo encontrar', 404));
    }

    return res.status(200).json({
        data: entrega
    });
});

exports.createEntrega = catchAsync(async (req, res, next) => {
    const nuevaEntrega = await entregaService.create({
        ...req.body,
        id_empresa: req.user.id_empresa // Viene del token decodificado
    });
    return res.status(201).json(nuevaEntrega);    
});

exports.updateEntrega = catchAsync(async (req, res, next) => {
    const actualizado = await entregaService.update(req.params.id, {
        ...req.body,
        id_empresa: req.user.id_empresa // Viene del token decodificado
    }, req.user);

    if (!actualizado) {
        logger.warn(`Intento de actualización de la Entrega fallido:`, { 
            id: req.params.id, 
            user: req.user?.id 
        });
        return next(new AppError('No se pudo actualizar', 404));
    }

    return res.status(200).json({
        data: actualizado
    });
});

exports.deleteEntrega = catchAsync(async (req, res, next) => {
    const eliminado = await entregaService.remove(req.params.id, req.user);

    if (!eliminado) {
        logger.error(`Error crítico: Fallo al eliminar la Entrega`, { 
            id: req.params.id, 
            user: req.user?.id 
        });
        return next(new AppError('No se pudo eliminar', 404));
    }

    return res.status(200).json({
        data: eliminado
    });
});
