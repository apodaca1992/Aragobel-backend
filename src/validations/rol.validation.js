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
        // La llave del objeto sigue siendo el nombre del módulo (ej: CHECADOR, ENTREGAS)
        Joi.string().valid(...LISTA_RECURSOS), 
        
        // El valor ahora es un OBJETO con las dos nuevas propiedades obligatorias
        Joi.object({
            acciones_modulo: Joi.array()
                .items(Joi.string().valid(...LISTA_ACCIONES))
                .required(),
                
            recursos_internos: Joi.array()
                .items(Joi.string()) // Aquí van las colecciones (TIENDAS, ASISTENCIAS, etc.)
                .required()
        }).required()
    )
    .required()
    .messages({
        'any.required': 'El objeto de permisos es obligatorio',
        'object.base': 'Permisos debe ser un objeto válido'
    })
});

// 2. Generar esquema para UPDATE dinámicamente
// Tomamos el esquema de arriba y convertimos 'nombre' en opcional
const updateRolSchema = rolSchema.fork(['nombre'], (schema) => schema.optional());

module.exports = { rolSchema,updateRolSchema };