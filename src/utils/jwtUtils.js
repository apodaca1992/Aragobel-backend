// src/utils/JwtUtils.js
const jwt = require('jsonwebtoken');
const AppError = require('./appError');
const logger = require('./logger');

class JwtUtils {
    /**
     * Genera un token firmado
     * @param {Object} payload - Datos a guardar en el token (id, roles, etc)
     * @returns {string} token
     */
    static generarToken(payload) {
        try {
            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRES_IN || '24h'
            });           
            return token;
        } catch (error) {
            logger.error('Error crítico al generar JWT', { error: error.message });
            throw new AppError('Error al generar la sesión', 500);
        }
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
            const tokenIdentifier = token?.substring(0, 10);

            if (error.name === 'TokenExpiredError') {
                logger.warn('Token expirado detectado', { 
                    tokenHead: tokenIdentifier,
                    expiredAt: error.expiredAt 
                });
                throw new AppError('El token ha expirado. Por favor, inicia sesión de nuevo.', 401);
            }

            if (error.name === 'JsonWebTokenError') {
                logger.error('Firma de token inválida o malformada', { 
                    tokenHead: tokenIdentifier,
                    reason: error.message 
                });
            }

            throw new AppError('Token inválido o malformado.', 401);
        }
    }
}

module.exports = JwtUtils;