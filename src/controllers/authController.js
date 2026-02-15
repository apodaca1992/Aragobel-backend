const authService = require('../services/authService');

const register = async (req, res) => {
    try {
        const nuevoUsuario = await authService.registrar(req.body);
        // No devolvemos la contraseña en la respuesta por seguridad
        const { contrasena, ...usuarioSinPassword } = nuevoUsuario.toJSON();
        res.status(201).json(usuarioSinPassword);
    } catch (error) {
        res.status(400).json({ error: 'Error al registrar usuario', detalle: error.message });
    }
};

const login = async (req, res) => {
    try {
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
    } catch (error) {
        // Si el servicio lanza error de "no encontrado" o "incorrecto", respondemos 401
        res.status(401).json({ error: error.message });
    }
};

module.exports = { register, login };