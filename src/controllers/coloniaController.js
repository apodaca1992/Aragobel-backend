const coloniaService = require('../services/coloniaService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

exports.getColonias = catchAsync(async (req, res, next) => {
    // 1. Extraemos los parámetros que vienen de Postman (?limit=5&zona=Norte)
    const { 
        limit, 
        lastDocId, 
        orderBy, 
        orderDir,
        ignorarLimite,
        ...filtros // Todo lo demás que no sea paginación se va a filtros
    } = req.query;

    // Convertimos el string "true" a un booleano real de JavaScript
    const activarIgnorarLimite = ignorarLimite === 'true';
    
    // 2. Pasamos un objeto de opciones al servicio
    const colonias = await coloniaService.getAll({
        limit, 
        lastDocId, 
        orderBy, 
        orderDir,
        ignorarLimite: activarIgnorarLimite,
        filtros: { ...filtros, id_empresa: req.user.id_empresa }
    });
    return res.status(200).json({
        length: colonias.length,
        data: colonias
    });
});

exports.getColoniaById = catchAsync(async (req, res, next) => {
    const colonia = await coloniaService.getById(req.params.id, req.user);

    if (!colonia) {
        logger.warn(`Colonia no encontrada`, { id, user: req.user?.id });
        return next(new AppError('No se pudo encontrar', 404));
    }

    return res.status(200).json({
        data: colonia
    });
});

exports.createColonia = catchAsync(async (req, res, next) => {
    const nuevaColonia = await coloniaService.create({
        ...req.body,
        id_empresa: req.user.id_empresa // Viene del token decodificado
    });
    return res.status(201).json(nuevaColonia);    
});

exports.updateColonia = catchAsync(async (req, res, next) => {
    const actualizado = await coloniaService.update(req.params.id, {
        ...req.body,
        id_empresa: req.user.id_empresa // Viene del token decodificado
    }, req.user);

    if (!actualizado) {
        logger.warn(`Intento de actualización de la Colonia fallido:`, { 
            id: req.params.id, 
            user: req.user?.id 
        });
        return next(new AppError('No se pudo actualizar', 404));
    }

    return res.status(200).json({
        data: actualizado
    });
});

exports.deleteColonia = catchAsync(async (req, res, next) => {
    const eliminado = await coloniaService.remove(req.params.id, req.user);

    if (!eliminado) {
        logger.error(`Error crítico: Fallo al eliminar la Colonia`, { 
            id: req.params.id, 
            user: req.user?.id 
        });
        return next(new AppError('No se pudo eliminar', 404));
    }

    return res.status(200).json({
        data: eliminado
    });
});
