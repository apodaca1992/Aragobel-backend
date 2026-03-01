const { Usuario, Rol } = require('../models');
const cryptoUtils = require('../utils/cryptoUtils');
const JwtUtils = require('../utils/jwtUtils');
const logger = require('../utils/logger');

const registrar = async (datos) => {
    const hash = await cryptoUtils.hashPassword(datos.contrasena);
    return await Usuario.create({
        ...datos,
        contrasena: hash
    });
};

const login = async (usuario, contrasena) => {
    // 1. Buscar usuario y sus roles en una sola consulta
    // Senior Tip: Traemos solo los campos necesarios de los Roles (nombre y permisos JSON)
    const user = await Usuario.findOne({ 
        where: { usuario },
        include: [{
            model: Rol,
            attributes: ['nombre', 'permisos'],
            through: { attributes: [] } // Excluimos campos de la tabla intermedia
        }]
    });

    if (!user) {
        logger.warn(`Intento de login fallido: Usuario no encontrado (${usuario})`);
        return null;
    }

    // 2. Comparar contraseña
    const isMatch = await cryptoUtils.comparePassword(contrasena, user.contrasena);
    if (!isMatch) {
        logger.warn(`Intento de login fallido: Contraseña incorrecta para (${usuario})`);
        return null;
    }

    // --- PROCESO DE MERGE DE PERMISOS (Súper eficiente) ---
    const permisosMap = {};
    const rolesList = [];

    if (user.Rols && user.Rols.length > 0) {
        user.Rols.forEach(rol => {
            rolesList.push(rol.nombre.toUpperCase());

            // rol.permisos ya es un objeto JS gracias a Sequelize DataTypes.JSON
            const config = rol.permisos || {};

            Object.entries(config).forEach(([recurso, acciones]) => {
                if (!permisosMap[recurso]) {
                    // Usamos un Set para evitar duplicados si el usuario tiene varios roles
                    permisosMap[recurso] = new Set();
                }
                acciones.forEach(accion => permisosMap[recurso].add(accion));
            });
        });
    }

    // Convertimos los Sets a Arrays para el JWT y el Frontend
    const permisosFinales = {};
    Object.keys(permisosMap).forEach(recurso => {
        permisosFinales[recurso] = Array.from(permisosMap[recurso]);
    });

    // 3. Generar Token con la nueva estructura
    const token = JwtUtils.generarToken({ 
        id: user.id_usuario, 
        usuario: user.usuario,
        roles: rolesList,
        permisos: permisosFinales 
    });

    logger.info(`Login exitoso: ${user.usuario} con roles: ${rolesList.join(', ')}`);

    return { 
        user: { 
            id: user.id_usuario, 
            usuario: user.usuario, 
            roles: rolesList 
        },
        token,
        permisos: permisosFinales
    };
};

module.exports = { registrar, login };