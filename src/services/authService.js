const Firestore = require('../utils/firestoreUtils'); // Importamos el objeto completo
const cryptoUtils = require('../utils/cryptoUtils');
const JwtUtils = require('../utils/jwtUtils');
const logger = require('../utils/logger');
const AppError = require('../utils/appError');

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

    // 3. DINAMISMO: Extraemos lo que NO queremos y guardamos el RESTO
    // Sacamos 'contrasena' y 'permisos' del objeto original
    // 'userData' contendrá todo lo demás (id, usuario, roles, email, foto, etc.)
    const { contrasena: _pw, permisos: _pm, ...userData } = user;

    // 3. Generar Token con la nueva estructura
    const token = JwtUtils.generarToken({ 
        id: user.id, 
        usuario: user.usuario,
        id_tienda: user.id_tienda,
        id_empresa: user.id_empresa,
        roles: user.roles,
        permisos: user.permisos,
        modulos_empresa: modulos_empresa
    });

    logger.info(`Login exitoso: ${user.usuario} con roles: ${user.roles.join(', ')}`);

    return { 
        user: userData,
        empresa: {
            id: empresa.id, 
            nombre: empresa.nombre,
            modulos: modulos_empresa // Aquí regresas las banderas para Ionic
        },
        token,
        permisos: user.permisos
    };
};

module.exports = { login };