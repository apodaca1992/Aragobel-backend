const authService = require('../services/authService');
const catchAsync = require('../utils/catchAsync');

exports.register = catchAsync(async (req, res, next) => {
    const nuevoUsuario = await authService.registrar(req.body);
    // No devolvemos la contraseña en la respuesta por seguridad
    const { contrasena, ...usuarioSinPassword } = nuevoUsuario.toJSON();
    res.status(201).json(usuarioSinPassword);
});

exports.login = catchAsync(async (req, res, next) => {
    const { usuario, contrasena } = req.body;

    if (!usuario || !contrasena) {
        return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    const data = await authService.login(usuario, contrasena);
    
    // Enviamos el token y los datos del usuario (excepto la contraseña)
    res.json({
        mensaje: 'Login exitoso',
        ...data
    });
});