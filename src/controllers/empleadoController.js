const empleadoService = require('../services/empleadoService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

exports.getEmpleados = catchAsync(async (req, res, next) => {
    const empleados = await empleadoService.getAll();
    return res.status(200).json({
        length: empleados.length,
        data: empleados
    });
});

exports.getEmpleadoById = catchAsync(async (req, res, next) => {
    const empleado = await empleadoService.getById(req.params.id);

    if (!empleado) {
        logger.warn(`Empleado no encontrado`, { id, user: req.user?.id });
        return next(new AppError('No se pudo encontrar', 404));
    }

    return res.status(200).json({
        data: empleado
    });
});

exports.createEmpleado = catchAsync(async (req, res, next) => {
    const nuevoEmpleado = await empleadoService.create(req.body);
    return res.status(201).json(nuevoEmpleado);
});

exports.updateEmpleado = catchAsync(async (req, res, next) => {
    const actualizado = await empleadoService.update(req.params.id, req.body);

    if (!actualizado) {
        logger.warn(`Intento de actualización del Empleado fallido:`, { 
            id: req.params.id, 
            user: req.user?.id 
        });
        return next(new AppError('No se pudo actualizar', 404));
    }

    return res.status(200).json({
        data: actualizado
    });
});

exports.deleteEmpleado = catchAsync(async (req, res, next) => {
    const eliminado = await empleadoService.remove(req.params.id);

    if (!eliminado) {
        logger.error(`Error crítico: Fallo al eliminar el Empleado`, { 
            id: req.params.id, 
            user: req.user?.id 
        });
        return next(new AppError('No se pudo eliminar', 404));
    }

    return res.status(200).json({
        message: 'Se elimino correctamente'
    });
});