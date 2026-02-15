const Usuario = require('../models/Usuario'); // Asegúrate de tener este modelo
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const registrar = async (datos) => {
    // 1. Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(datos.contrasena, salt);
    
    // 2. Sobrescribir la contraseña con el hash y crear
    return await Usuario.create({
        ...datos,
        contrasena: hash
    });
};

const login = async (usuario, contrasena) => {
    // 1. Buscar usuario por nombre de usuario
    const user = await Usuario.findOne({ where: { usuario } });
    if (!user) throw new Error('Usuario no encontrado');

    // 2. Comparar contraseña (bcrypt maneja el hash)
    const isMatch = await bcrypt.compare(contrasena, user.contrasena);
    if (!isMatch) throw new Error('Contraseña incorrecta');

    // 3. Generar Token
    const token = jwt.sign(
        { id: user.id_usuario, usuario: user.usuario },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return { user: { id: user.id_usuario, usuario: user.usuario }, token };
};

module.exports = { registrar, login };