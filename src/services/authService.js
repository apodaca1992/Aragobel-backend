const Firestore = require('../utils/firestoreUtils'); // Importamos el objeto completo
const cryptoUtils = require('../utils/cryptoUtils');
const JwtUtils = require('../utils/jwtUtils');
const logger = require('../utils/logger');
const AppError = require('../utils/appError');

const registrar = async (datos) => {
    // 1. Verificar si el nombre de usuario ya existe
    const usuarioExistente = await Firestore.findOne('usuarios', 'usuario', datos.usuario);
    if (usuarioExistente) {
        logger.warn(`El nombre de usuario ya está en uso (${datos.usuario})`);
        throw new AppError('El nombre de usuario ya está en uso', 400);
    }

    /*// 2. Verificar si el email ya existe
    const emailExistente = await Firestore.findOne('usuarios', 'email', datos.email);
    if (emailExistente) {
        logger.warn(`El correo electrónico ya está registrado (${datos.email})`);
        throw new AppError('El correo electrónico ya está registrado', 400);
    }*/

    const hash = await cryptoUtils.hashPassword(datos.contrasena);
    return await Firestore.create('usuarios', {
        ...datos,
        contrasena: hash
    });
};

const login = async (usuario, contrasena) => {

    const user = await Firestore.findOne('usuarios', 'usuario', usuario);
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

    // --- NUEVA LÓGICA DE EMPRESA Y MÓDULOS ---
    if (!user.id_empresa) {
        throw new AppError('El usuario no tiene una empresa asignada', 403);
    }

    const empresa = await Firestore.findByPk('empresas', user.id_empresa);
    if (!empresa || empresa.activo === 0) {
        throw new AppError('Empresa no encontrada o inactiva', 403);
    }

    // Extraemos las banderas de módulos (asumiendo que en Firestore están como objeto)
    // Ejemplo: modulos: { checador: true, entregas: false }
    const modulos_empresa = empresa.modulos || {};
    // -----------------------------------------

    // 3. Generar Token con la nueva estructura
    const token = JwtUtils.generarToken({ 
        id: user.id, 
        usuario: user.usuario,
        id_empresa: user.id_empresa,
        roles: user.roles,
        permisos: user.permisos,
        modulos_empresa: modulos_empresa
    });

    logger.info(`Login exitoso: ${user.usuario} con roles: ${user.roles.join(', ')}`);

    return { 
        user: { 
            id: user.id, 
            usuario: user.usuario, 
            id_tienda: user.id_tienda, 
            id_empresa: user.id_empresa,
            roles: user.roles 
        },
        empresa: {
            nombre: empresa.nombre,
            modulos: modulos_empresa // Aquí regresas las banderas para Ionic
        },
        token,
        permisos: user.permisos
    };
};

module.exports = { registrar, login };