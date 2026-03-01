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

module.exports = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message; // La desestructuración no copia propiedades no enumerables
    error.statusCode = err.statusCode || 500;
    error.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(error, req, res);
    } else {
        // Normalizar errores específicos de bases de datos o seguridad
        if (err.name === 'CastError') error = handleCastErrorDB(error);
        if (err.code === 11000) error = handleDuplicateFieldsDB(error);
        if (err.name === 'JsonWebTokenError') error = handleJWTError();
        if (err.name === 'TokenExpiredError') error = new AppError('Su sesión ha expirado.', 401);

        sendErrorProd(error, req, res);
    }
};