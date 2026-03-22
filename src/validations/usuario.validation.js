const Joi = require('joi');
const { LISTA_RECURSOS, LISTA_ACCIONES } = require('../config/constants');

const usuarioSchema = Joi.object({
    usuario: Joi.string()
        .max(100)
        .required()
        .messages({
            'string.empty': 'El usuario es obligatorio',
            'any.required': 'El usuario es un campo requerido',
            'string.max': 'El usuario no puede exceder los 100 caracteres'
        }),
    email: Joi.string()
        .max(100)
        .email() // <--- Valida formato: user@dominio.com
        .lowercase() // <--- Normaliza a minúsculas automáticamente
        .messages({
            'string.email': 'El formato del correo electrónico no es válido',
            'string.max': 'El email no puede exceder los 100 caracteres'
        }),
    contrasena: Joi.string()
        .max(100)
        .required()
        .messages({
            'string.empty': 'La contraseña es obligatoria',
            'any.required': 'La contraseña es un campo requerido',
            'string.max': 'La contraseña no puede exceder los 100 caracteres'
        }),
    id_empleado: Joi.string()
        .guid({ version: 'uuidv4' }) 
        .required()
        .messages({
            'string.guid': 'El ID del empleado proporcionado no tiene un formato UUID válido', // Error de formato
            'string.empty': 'El ID del empleado no puede estar vacío',         // Error de string ""
            'any.required': 'El ID del empleado es obligatorio'
        }),
    permisos: Joi.object().pattern(
        Joi.string().valid(...LISTA_RECURSOS), 
        Joi.array().items(Joi.string().valid(...LISTA_ACCIONES))
    )
    .required()
    .messages({
        'any.required': 'El objeto de permisos es obligatorio',
        'object.base': 'Permisos debe ser un objeto válido'
    }),
    roles: Joi.array()
        .min(1) // Al menos debe tener un rol
        .required()
        .messages({
            'array.base': 'Roles debe ser un arreglo',
            'array.min': 'El usuario debe tener al menos un rol'
        })
});

module.exports = { usuarioSchema };