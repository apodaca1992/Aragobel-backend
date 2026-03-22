const AppError = require('../utils/appError');
const logger = require('../utils/logger'); // Un logger real

/**
 * Normalizadores de errores comunes de librerías externas
 */
const handleCastErrorDB = err => {
    const message = `Valor inválido ${err.value} para el campo ${err.path}.`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    const message = `Valor duplicado: ${value}. Por favor use otro valor.`;
    return new AppError(message, 400);
};

const handleJWTError = () => new AppError('Token inválido. Inicie sesión de nuevo.', 401);

const sendErrorDev = (err, req, res) => {
    logger.debug(`[DEV ERROR] ${req.method} ${req.originalUrl}`, {
        status: err.status,
        message: err.message,
        stack: err.stack
    });
    if (req.originalUrl.startsWith('/api')) {
        return res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        });
    }
    // Rendered Website response (si aplica)
    console.error('ERROR', err);
    return res.status(err.statusCode).render('error', { title: 'Algo salió mal', msg: err.message });
};

const sendErrorProd = (err, req, res) => {
    // A) Errores Operacionales: Enviar mensaje al cliente
    if (err.isOperational) {
        logger.warn(`Operational Error: ${err.message}`, {
            path: req.originalUrl,
            userId: req.user?.id,
            statusCode: err.statusCode
        });
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });
    }

    logger.error('CRITICAL SYSTEM ERROR 💥', {
        message: err.message,
        stack: err.stack,
        path: req.originalUrl,
        method: req.method,
        body: req.body, // ¡Cuidado! Asegúrate de que tu logger oculte contraseñas
        user: req.user?.id
    });

    return res.status(500).json({
        status: 'error',
        message: 'Inténtelo más tarde. Problema interno del servidor.'
    });
};

const handleValidationErrorJoi = err => {
    // Si el error viene de Joi, ya trae un mensaje formateado con todos los detalles
    return new AppError(err.message, 400);
};

const handleFirestoreError = err => {
    // Mapeamos los códigos de error de Firebase a mensajes legibles
    const errors = {
        'permission-denied': 'No tienes permisos suficientes para acceder a este recurso.',
        'unavailable': 'El servicio de base de datos está temporalmente fuera de línea.',
        'deadline-exceeded': 'La consulta tardó demasiado tiempo. Inténtalo de nuevo.',
        'not-found': 'El recurso solicitado no existe en la base de datos.'
    };

    const message = errors[err.code] || 'Error inesperado en la base de datos.';
    return new AppError(message, 400);
};


module.exports = (err, req, res, next) => {
    // 1. Mantenemos el objeto original pero aseguramos los defaults
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, req, res);
    } else {
        // 2. IMPORTANTE: En producción, trabajamos sobre el objeto 'err' directamente
        // o creamos una copia que explícitamente mantenga el mensaje y el flag
        let error = Object.assign(err); 
        error.message = err.message;

        // 1. Detectar errores de Joi
        if (err.name === 'ValidationError') error = handleValidationErrorJoi(error);
        
        // 2. Errores de Base de Datos
        if (err.name === 'CastError') error = handleCastErrorDB(error);
        if (err.code === 11000) error = handleDuplicateFieldsDB(error);

        // 2. NUEVO: Errores de Firestore
        // El SDK de Firebase usa .code como un string para sus errores
        if (typeof err.code === 'string' && err.stack?.includes('firestore')) {
            error = handleFirestoreError(error);
        }
        
        // 3. Seguridad
        if (err.name === 'JsonWebTokenError') error = handleJWTError();
        if (err.name === 'TokenExpiredError') error = new AppError('Su sesión ha expirado.', 401);

        // 3. Enviamos a producción (Aquí se revisará el .isOperational)
        sendErrorProd(error, req, res);
    }
};