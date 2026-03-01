const rolService = require('../services/rolService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getRoles = catchAsync(async (req, res, next) => {
    const roles = await rolService.getAll();
    return res.status(200).json({
        length: roles.length,
        data: roles
    });
});

exports.getRolById = catchAsync(async (req, res, next) => {
    const rol = await rolService.getById(req.params.id);

    if (!rol) {
        logger.warn(`Rol no encontrado`, { id, user: req.user?.id });
        return next(new AppError('No se pudo encontrar', 404));
    }

    return res.status(200).json({
        data: rol
    });
});

exports.createRol = catchAsync(async (req, res, next) => {
    const nuevoRol = await rolService.create(req.body);
    return res.status(201).json(nuevoRol);    
});

exports.updateRol = catchAsync(async (req, res, next) => {
    const actualizado = await rolService.update(req.params.id, req.body);

    if (!actualizado) {
        logger.warn(`Intento de actualización del Rol fallido:`, { 
            id: req.params.id, 
            user: req.user?.id 
        });
        return next(new AppError('No se pudo actualizar', 404));
    }

    return res.status(200).json({
        data: actualizado
    });
});

exports.deleteRol = catchAsync(async (req, res, next) => {
    const eliminado = await rolService.remove(req.params.id);

    if (!eliminado) {
        logger.error(`Error crítico: Fallo al eliminar el Rol`, { 
            id: req.params.id, 
            user: req.user?.id 
        });
        return next(new AppError('No se pudo eliminar', 404));
    }

    return res.status(200).json({
        message: 'Se elimino correctamente'
    });
});
