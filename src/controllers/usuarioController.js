const usuarioService = require('../services/usuarioService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

exports.getUsuarios = catchAsync(async (req, res, next) => {
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
    const usuarios = await usuarioService.getAll({
        limit, 
        lastDocId, 
        orderBy, 
        orderDir,
        ignorarLimite: activarIgnorarLimite,
        filtros: { ...filtros, id_empresa: req.user.id_empresa }
    });
    return res.status(200).json({
        length: usuarios.length,
        data: usuarios
    });
});

exports.getUsuarioById = catchAsync(async (req, res, next) => {
    const usuario = await usuarioService.getById(req.params.id, req.user);

    if (!usuario) {
        logger.warn(`Usuario no encontrado`, { id, user: req.user?.id });
        return next(new AppError('No se pudo encontrar', 404));
    }

    return res.status(200).json({
        data: usuario
    });
});

exports.createUsuario = catchAsync(async (req, res, next) => {    
    const nuevoUsuario = await usuarioService.create({
        ...req.body,
        id_empresa: req.user.id_empresa // Viene del token decodificado
    });
    const { contrasena, ...usuarioSinPassword } = nuevoUsuario;
    return res.status(201).json({
        data: {
            user: usuarioSinPassword
        }
    });
});

exports.updateUsuario = catchAsync(async (req, res, next) => {
    const actualizado = await usuarioService.update(req.params.id, {
        ...req.body,
        id_empresa: req.user.id_empresa // Viene del token decodificado
    }, req.user);

    if (!actualizado) {
        logger.warn(`Intento de actualización de el Usuario fallido:`, { 
            id: req.params.id, 
            user: req.user?.id 
        });
        return next(new AppError('No se pudo actualizar', 404));
    }

    return res.status(200).json({
        data: actualizado
    });
});

exports.deleteUsuario = catchAsync(async (req, res, next) => {
    const eliminado = await usuarioService.remove(req.params.id, req.user);

    if (!eliminado) {
        logger.error(`Error crítico: Fallo al eliminar el Usuario`, { 
            id: req.params.id, 
            user: req.user?.id 
        });
        return next(new AppError('No se pudo eliminar', 404));
    }

    return res.status(200).json({
        data: eliminado
    });
});
