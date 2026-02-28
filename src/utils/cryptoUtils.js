// src/utils/CryptoUtils.js
const bcrypt = require('bcryptjs');

class CryptoUtils {
    /**
     * Encripta una cadena de texto (contraseña)
     * @param {string} password 
     * @returns {Promise<string>} hash
     */
    static async hashPassword(password) {
        if (!password) return null;
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(password, salt);
    }

    /**
     * Compara una contraseña en texto plano con un hash
     * @param {string} password 
     * @param {string} hashedValue 
     * @returns {Promise<boolean>}
     */
    static async comparePassword(password, hashedValue) {
        return await bcrypt.compare(password, hashedValue);
    }
}

module.exports = CryptoUtils;