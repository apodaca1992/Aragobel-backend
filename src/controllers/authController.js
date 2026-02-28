const authService = require('../services/authService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.register = catchAsync(async (req, res, next) => {
    const nuevoUsuario = await authService.registrar(req.body);
    const { contrasena, ...usuarioSinPassword } = nuevoUsuario.toJSON();
    return res.status(201).json({
        data: {
            user: usuarioSinPassword
        }
    });
});

exports.login = catchAsync(async (req, res, next) => {
    const { usuario, contrasena } = req.body;

    if (!usuario || !contrasena) {
        return next(new AppError('Usuario y contraseña son requeridos', 400));
    }

    const data = await authService.login(usuario, contrasena);
    
    if (!data) {
        return next(new AppError('Credenciales incorrectas', 401));
    }

    // 4. Respuesta de éxito con return
    return res.status(200).json({
        token: data.token, // Estructura explícita
        user: data.user,
        permisos: data.permisos
    });
});