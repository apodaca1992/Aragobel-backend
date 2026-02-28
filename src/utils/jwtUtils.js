// src/utils/JwtUtils.js
const jwt = require('jsonwebtoken');
const AppError = require('./appError');

class JwtUtils {
    /**
     * Genera un token firmado
     * @param {Object} payload - Datos a guardar en el token (id, roles, etc)
     * @returns {string} token
     */
    static generarToken(payload) {
        return jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        });
    }

    /**
     * Verifica la validez de un token
     * @param {string} token 
     * @returns {Object} payload decodificado
     */
    static verificarToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            // Personalizamos el error según el tipo de fallo de JWT
            if (error.name === 'TokenExpiredError') {
                throw new AppError('El token ha expirado. Por favor, inicia sesión de nuevo.', 401);
            }
            throw new AppError('Token inválido o malformado.', 401);
        }
    }
}

module.exports = JwtUtils;