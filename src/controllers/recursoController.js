const recursoService = require('../services/recursoService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getRecursos = catchAsync(async (req, res, next) => {
    const recursos = await recursoService.getAll();
    // Siempre retorna la respuesta para cerrar el ciclo
    return res.status(200).json({
        length: recursos.length,
        data: recursos
    });
});

exports.getRecursoById = catchAsync(async (req, res, next) => {
    const recurso = await recursoService.getById(req.params.id);

    if (!recurso) {
        return next(new AppError('No se pudo encontrar', 404));
    }

    return res.status(200).json({
        data: recurso
    });
});

exports.createRecurso = catchAsync(async (req, res, next) => {
    const nuevoRecurso = await recursoService.create(req.body);
    return res.status(201).json(nuevoRecurso);    
});

exports.updateRecurso = catchAsync(async (req, res, next) => {
    const actualizado = await recursoService.update(req.params.id, req.body);

    if (!actualizado) {
        return next(new AppError('No se pudo actualizar', 404));
    }

    return res.status(200).json({
        data: actualizado
    });
});

exports.deleteRecurso = catchAsync(async (req, res, next) => {
    const eliminado = await recursoService.remove(req.params.id);

    if (!eliminado) {
        return next(new AppError('No se pudo eliminar', 404));
    }

    return res.status(200).json({
        message: 'Se elimino correctamente'
    });
});