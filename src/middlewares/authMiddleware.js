const Authorization = require('../utils/Authorization');
const AppError = require('../utils/appError');
const JwtUtils = require('../utils/jwtUtils');
const logger = require('../utils/logger');

const validarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    // Un Senior valida el formato estricto: "Bearer <token>"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn('Intento de acceso sin formato Bearer', { 
            ip: req.ip, 
            endpoint: req.originalUrl 
        });
        return next(new AppError('Formato de autenticación inválido. Use Bearer <token>.', 401));
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = JwtUtils.verificarToken(token);
        
        // Validar que el decoded no sea nulo y tenga info mínima
        if (!decoded || !decoded.id) {
            logger.error('Payload de token corrupto o vacío', { token_presente: !!token });
            return next(new AppError('Token inválido: sesión corrupta.', 401));
        }

        req.user = decoded; 
        next();
    } catch (error) {        
        // Logueamos solo si no es expiración (las expiraciones son normales, los errores de firma no)
        if (!isExpired) {
            logger.error('Fallo en verificación de JWT', { 
                error: error.message, 
                ip: req.ip 
            });
        }

        const message = isExpired ? 'Sesión expirada.' : 'Token inválido.';
        return next(new AppError(message, 401));
    }
};

const checkPermission = (recursoConfigurado = null) => {
    return (req, res, next) => {
        const { user } = req;

        if (!user) {
            logger.error('Middleware checkPermission ejecutado sin req.user', {
                path: req.originalUrl,
                metodo: req.method
            });
            return next(new AppError('Contexto de usuario no encontrado.', 500));
        }
        
        if (Authorization.isAdmin(user)) return next();
        
        const recurso = recursoConfigurado || req.baseUrl.split('/').filter(Boolean).pop()?.toUpperCase();
        
        if (!recurso) {
            logger.warn('Fallo al inferir recurso para autorización', { baseUrl: req.baseUrl });
            return next(new AppError('No se pudo determinar el recurso.', 500));
        }
                    
        const hasId = Boolean(req.params && req.params.id);
        const accion = Authorization.getActionByMethod(req.method, hasId);

        if (!accion) {
            logger.warn('Acción HTTP no mapeada en Authorization', { 
                method: req.method, 
                path: req.originalUrl 
            });
            return next(new AppError('Acción no reconocida', 405));
        }

        if (Authorization.hasPermission(user, recurso, accion)) {
            return next();
        }

        // Log de seguridad (Opcional pero muy Senior)
        logger.warn('Acceso denegado (RBAC)', {
            userId: user.id,
            role: user.role, // O el campo de rol que uses
            recurso,
            accion,
            path: req.originalUrl,
            ip: req.ip
        });
        
        return next(new AppError(`No tienes permiso para ${accion} en ${recurso}`, 403));
    };
};

module.exports = { validarToken, checkPermission };