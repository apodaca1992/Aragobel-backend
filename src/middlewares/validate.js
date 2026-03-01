// middlewares/validate.js
const logger = require('../utils/logger');

const validate = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
        const detalles = error.details.map(d => d.message);
        logger.warn('Error de validación en la petición', { detalles });
        return res.status(400).json({
            status: 'error',
            message: 'Datos de entrada inválidos',
            errors: detalles
        });
    }

    req.body = value; // Reemplazamos por los datos limpios
    next();
};

module.exports = validate;