const jwt = require('jsonwebtoken');
const Authorization = require('../utils/Authorization');
const AppError = require('../utils/appError');

const validarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // El token suele venir como "Bearer <token>"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next(new AppError('Acceso denegado. Token no proporcionado.', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Guardamos los datos del usuario en la petición
    return next(); // Continuar al controlador
};

const checkPermission = (recursoOpcional = null) => {
    return (req, res, next) => {
        const user = req.user;

        if (!user) {
            return next(new AppError('Usuario no autenticado en la petición', 500));
        }
        
        if (Authorization.isAdmin(user)) {
            return next();
        }
        
        // Obtenemos el recurso del final de la URL (ej: /api/entregas -> ENTREGAS)
        const recurso = recursoOpcional || req.baseUrl.split('/').pop().toUpperCase();
                    
        const accion = Authorization.getActionByMethod(req.method, !!req.params.id);

        if (!accion) {
            return next(new AppError('Acción no reconocida', 400));
        }

        // Validación final
        if (Authorization.hasPermission(user,recurso,accion)) {
            return next();
        }

        // Si llega aquí, no tiene permiso
        return next(new AppError(`No tienes permiso para ${accion} en ${recurso}`, 403));
    };
};

module.exports = { validarToken, checkPermission };