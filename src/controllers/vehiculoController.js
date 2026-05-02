const vehiculoService = require('../services/vehiculoService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

exports.getVehiculos = catchAsync(async (req, res, next) => {
    // 1. Extraemos los parámetros que vienen de Postman (?limit=5&zona=Norte)
    const { 
        limit, 
        lastDocId, 
        orderBy, 
        orderDir,
        ...filtros // Todo lo demás que no sea paginación se va a filtros
    } = req.query;
    
    // 2. Pasamos un objeto de opciones al servicio
    const vehiculos = await vehiculoService.getAll({
        limit, 
        lastDocId, 
        orderBy, 
        orderDir,
        filtros: { ...filtros, id_empresa: req.user.id_empresa }
    });
    return res.status(200).json({
        length: vehiculos.length,
        data: vehiculos
    });
});

exports.getVehiculoById = catchAsync(async (req, res, next) => {
    const vehiculo = await vehiculoService.getById(req.params.id, req.user);

    if (!vehiculo) {
        logger.warn(`Vehiculo no encontrada`, { id, user: req.user?.id });
        return next(new AppError('No se pudo encontrar', 404));
    }

    return res.status(200).json({
        data: vehiculo
    });
});

exports.createVehiculo = catchAsync(async (req, res, next) => {
    const nuevaVehiculo = await vehiculoService.create({
        ...req.body,
        id_empresa: req.user.id_empresa // Viene del token decodificado
    });
    return res.status(201).json(nuevaVehiculo);    
});

exports.updateVehiculo = catchAsync(async (req, res, next) => {
    const actualizado = await vehiculoService.update(req.params.id, {
        ...req.body,
        id_empresa: req.user.id_empresa // Viene del token decodificado
    }, req.user);

    if (!actualizado) {
        logger.warn(`Intento de actualización de la Vehiculo fallido:`, { 
            id: req.params.id, 
            user: req.user?.id 
        });
        return next(new AppError('No se pudo actualizar', 404));
    }

    return res.status(200).json({
        data: actualizado
    });
});

exports.deleteVehiculo = catchAsync(async (req, res, next) => {
    const eliminado = await vehiculoService.remove(req.params.id, req.user);

    if (!eliminado) {
        logger.error(`Error crítico: Fallo al eliminar la Vehiculo`, { 
            id: req.params.id, 
            user: req.user?.id 
        });
        return next(new AppError('No se pudo eliminar', 404));
    }

    return res.status(200).json({
        data: eliminado
    });
});
