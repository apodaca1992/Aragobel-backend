const { Usuario, Rol } = require('../models');
const cryptoUtils = require('../utils/cryptoUtils');
const JwtUtils = require('../utils/jwtUtils');
const logger = require('../utils/logger');
const AppError = require('../utils/appError');

const registrar = async (datos) => {
    const hash = await cryptoUtils.hashPassword(datos.contrasena);
    return await Usuario.create({
        ...datos,
        contrasena: hash
    });
};

const login = async (usuario, contrasena) => {
    // Solo traemos los campos necesarios, incluyendo las nuevas columnas "caché"
    const user = await Usuario.findOne({ 
        where: { usuario },
        attributes: ['id_usuario', 'usuario', 'contrasena', 'permisos', 'roles'] 
    });

    if (!user) {
        logger.warn(`Intento de login fallido: Usuario no encontrado (${usuario})`);
        throw new AppError('Credenciales incorrectas', 401);
    }

    // 2. Comparar contraseña
    const isMatch = await cryptoUtils.comparePassword(contrasena, user.contrasena);
    if (!isMatch) {
        logger.warn(`Intento de login fallido: Contraseña incorrecta para (${usuario})`);
        throw new AppError('Credenciales incorrectas', 401);
    }

    // 3. Generar Token con la nueva estructura
    const token = JwtUtils.generarToken({ 
        id: user.id_usuario, 
        usuario: user.usuario,
        roles: user.roles,
        permisos: user.permisos 
    });

    logger.info(`Login exitoso: ${user.usuario} con roles: ${user.roles.join(', ')}`);

    return { 
        user: { 
            id: user.id_usuario, 
            usuario: user.usuario, 
            roles: user.roles 
        },
        token,
        permisos: user.permisos
    };
};

module.exports = { registrar, login };