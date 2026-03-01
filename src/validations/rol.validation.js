// validations/rol.validation.js
const Joi = require('joi');
const { LISTA_RECURSOS, LISTA_ACCIONES } = require('../config/constants');

const rolSchema = Joi.object({
    nombre: Joi.string()
        .max(100)
        .required()
        .messages({
            'string.empty': 'El nombre del rol es obligatorio',
            'any.required': 'El nombre del rol es un campo requerido',
            'string.max': 'El nombre del rol no puede exceder los 100 caracteres'
        }),

    descripcion: Joi.string() // <--- Agregamos este campo
        .max(100)
        .messages({
            'string.empty': 'La descripción del rol es obligatorio',
            'string.max': 'La descripción del rol no puede exceder los 100 caracteres'
        }),

    permisos: Joi.object().pattern(
        Joi.string().valid(...LISTA_RECURSOS), 
        Joi.array().items(Joi.string().valid(...LISTA_ACCIONES))
    )
    .required()
    .messages({
        'any.required': 'El objeto de permisos es obligatorio',
        'object.base': 'Permisos debe ser un objeto válido'
    })
});

module.exports = { rolSchema };