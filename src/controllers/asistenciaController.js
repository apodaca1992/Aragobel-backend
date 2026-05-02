const asistenciaService = require('../services/asistenciaService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

exports.getAsistencias = catchAsync(async (req, res, next) => {
    // 1. Extraemos los parámetros que vienen de Postman (?limit=5&zona=Norte)
    const { 
        limit, 
        lastDocId, 
        orderBy, 
        orderDir,
        ...filtros // Todo lo demás que no sea paginación se va a filtros
    } = req.query;
    
    // 2. Pasamos un objeto de opciones al servicio
    const asistencias = await asistenciaService.getAll({
        limit, 
        lastDocId, 
        orderBy, 
        orderDir,
        filtros: { ...filtros, id_empresa: req.user.id_empresa }
    });
    return res.status(200).json({
        length: asistencias.length,
        data: asistencias
    });
});

exports.getAsistenciaById = catchAsync(async (req, res, next) => {
    const asistencia = await asistenciaService.getById(req.params.id, req.user);

    if (!asistencia) {
        logger.warn(`Asistencia no encontrada`, { id, user: req.user?.id });
        return next(new AppError('No se pudo encontrar', 404));
    }

    return res.status(200).json({
        data: asistencia
    });
});

exports.createAsistencia = catchAsync(async (req, res, next) => {
    const datosParaRegistro = {
        ...req.body,
        id_usuario: req.user.id,
        id_empresa: req.user.id_empresa // Viene del token decodificado
    };
    const nuevaAsistencia = await asistenciaService.create(datosParaRegistro);
    return res.status(201).json(nuevaAsistencia);    
});

exports.updateAsistencia = catchAsync(async (req, res, next) => {
    const actualizado = await asistenciaService.update(req.params.id, {
        ...req.body,
        id_usuario: req.user.id,
        id_empresa: req.user.id_empresa // Viene del token decodificado
    }, req.user);

    if (!actualizado) {
        logger.warn(`Intento de actualización de la Asistencia fallido:`, { 
            id: req.params.id, 
            user: req.user?.id 
        });
        return next(new AppError('No se pudo actualizar', 404));
    }

    return res.status(200).json({
        data: actualizado
    });
});

exports.deleteAsistencia = catchAsync(async (req, res, next) => {
    const eliminado = await asistenciaService.remove(req.params.id, req.user);

    if (!eliminado) {
        logger.error(`Error crítico: Fallo al eliminar la Asistencia`, { 
            id: req.params.id, 
            user: req.user?.id 
        });
        return next(new AppError('No se pudo eliminar', 404));
    }

    return res.status(200).json({
        data: eliminado
    });
});

exports.getServerTime = catchAsync(async (req, res, next) => {
    // Obtenemos la fecha actual
    const now = new Date();
    
    // Generamos la fecha formateada para Mazatlán
    const localMazatlan = now.toLocaleString("sv-SE", { 
        timeZone: "America/Mazatlan" 
    });

    return res.status(200).json({
        success: true,
        data: {
            serverTime: now.getTime(), // Timestamp útil para cálculos en Ionic
            fecha: localMazatlan.split(' ')[0], // "2026-04-26"
            hora: localMazatlan.split(' ')[1],  // "12:30:45"
            timezone: 'America/Mazatlan'
        }
    });
});
