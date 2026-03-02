const Joi = require('joi');

const empleadoSchema = Joi.object({
    nombre: Joi.string()
        .max(100)
        .required()
        .messages({
            'string.empty': 'El nombre del empleado es obligatorio',
            'any.required': 'El nombre del empleado es un campo requerido',
            'string.max': 'El nombre del empleado no puede exceder los 100 caracteres'
        }),
    apellido_paterno: Joi.string()
        .max(100)
        .required()
        .messages({
            'string.empty': 'El apellido paterno del empleado es obligatorio',
            'any.required': 'El apellido paterno del empleado es un campo requerido',
            'string.max': 'El apellido paterno del empleado no puede exceder los 100 caracteres'
        }),
    apellido_materno: Joi.string()
        .max(100)
        .messages({
            'any.required': 'El nombre del empleado es un campo requerido',
            'string.max': 'El nombre del empleado no puede exceder los 100 caracteres'
        }),
    email: Joi.string()
        .email() // <--- Valida formato: user@dominio.com
        .lowercase() // <--- Normaliza a minúsculas automáticamente
        .required()
        .messages({
            'string.email': 'El formato del correo electrónico no es válido'
        }),
    id_tienda: Joi.string()
        .guid({ version: 'uuidv4' }) 
        .required()
        .messages({
            'string.guid': 'El ID de la tienda proporcionado no tiene un formato UUID válido', // Error de formato
            'string.empty': 'El ID de la tienda no puede estar vacío',         // Error de string ""
            'any.required': 'El ID de la tienda es obligatorio'
        }),
    id_puesto: Joi.string()
        .guid({ version: 'uuidv4' }) 
        .required()
        .messages({
            'string.guid': 'El ID del puesto proporcionado no tiene un formato UUID válido', // Error de formato
            'string.empty': 'El ID del puesto no puede estar vacío',         // Error de string ""
            'any.required': 'El ID del puesto es obligatorio'
        })
});

module.exports = { empleadoSchema };