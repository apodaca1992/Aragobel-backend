const tiendaService = require('../services/tiendaService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

exports.getTiendas = catchAsync(async (req, res, next) => {
    // 1. Extraemos los parámetros que vienen de Postman (?limit=5&zona=Norte)
    const { 
        limit, 
        lastDocId, 
        orderBy, 
        orderDir,
        ...filtros // Todo lo demás que no sea paginación se va a filtros
    } = req.query;
    
    // 2. Pasamos un objeto de opciones al servicio
    const tiendas = await tiendaService.getAll({
        limit, 
        lastDocId, 
        orderBy, 
        orderDir,
        filtros: { ...filtros, id_empresa: req.user.id_empresa }
    });
    return res.status(200).json({
        length: tiendas.length,
        data: tiendas
    });
});

exports.getTiendaById = catchAsync(async (req, res, next) => {
    const tienda = await tiendaService.getById(req.params.id, req.user);

    if (!tienda) {
        logger.warn(`Tienda no encontrada`, { id, user: req.user?.id });
        return next(new AppError('No se pudo encontrar', 404));
    }

    return res.status(200).json({
        data: tienda
    });
});

exports.createTienda = catchAsync(async (req, res, next) => {
    const nuevaTienda = await tiendaService.create({
        ...req.body,
        id_empresa: req.user.id_empresa // Viene del token decodificado
    });
    return res.status(201).json(nuevaTienda);    
});

exports.updateTienda = catchAsync(async (req, res, next) => {
    const actualizado = await tiendaService.update(req.params.id, {
        ...req.body,
        id_empresa: req.user.id_empresa // Viene del token decodificado
    }, req.user);

    if (!actualizado) {
        logger.warn(`Intento de actualización de la Tienda fallido:`, { 
            id: req.params.id, 
            user: req.user?.id 
        });
        return next(new AppError('No se pudo actualizar', 404));
    }

    return res.status(200).json({
        data: actualizado
    });
});

exports.deleteTienda = catchAsync(async (req, res, next) => {
    const eliminado = await tiendaService.remove(req.params.id, req.user);

    if (!eliminado) {
        logger.error(`Error crítico: Fallo al eliminar la Tienda`, { 
            id: req.params.id, 
            user: req.user?.id 
        });
        return next(new AppError('No se pudo eliminar', 404));
    }

    return res.status(200).json({
        data: eliminado
    });
});
