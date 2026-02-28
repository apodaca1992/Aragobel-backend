const jwt = require('jsonwebtoken');
const Authorization = require('../utils/Authorization');

const validarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // El token suele venir como "Bearer <token>"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Guardamos los datos del usuario en la petición
        next(); // Continuar al controlador
    } catch (error) {
        res.status(403).json({ error: 'Token inválido o expirado' });
    }
};

const checkPermission = (requiredPermissions = null) => {
    return (req, res, next) => {
        try {
            // 1. Extraer el token
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).json({ error: 'No se proporcionó un token' });

            const token = authHeader.split(' ')[1];
            req.user = jwt.verify(token, process.env.JWT_SECRET); // Datos del usuario y sus permisos

            // =========================================================
            // 1. EL PASE VIP: ¿Es Administrador?
            if (Authorization.isAdmin(req.user)) {
                return next();
            }
            
            // Obtenemos el recurso del final de la URL (ej: /api/entregas -> ENTREGAS)
            const recurso = req.baseUrl.split('/').pop().toUpperCase();
                        
            const accion = Authorization.getActionByMethod(req.method, !!req.params.id);

            if (!accion) {
                return next(new AppError('Acción no reconocida', 400));
            }

            // Validación final
            if (Authorization.hasPermission(req.user,recurso,accion)) {
                return next();
            }

            // Si llega aquí, no tiene permiso
            return next(new AppError(`No tienes permiso para ${accion} en ${recurso}`, 403));

        } catch (error) {
            return res.status(401).json({ error: 'Token inválido o sesión expirada' });
        }
    };
};

module.exports = { validarToken, checkPermission };