const jwt = require('jsonwebtoken');

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
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded; // Datos del usuario y sus permisos

            // =========================================================
            // 1. EL PASE VIP: ¿Es Administrador?
            const rolesUsuario = decoded.roles || [];
            if (rolesUsuario.includes('ADMINISTRADOR') || rolesUsuario.includes('ADMIN')) {
                return next(); // Es admin, no preguntamos más
            }

            const userPermissions = decoded.permisos || {};

            // --- CASO A: MODO MANUAL (Array de permisos) ---
            // Se usa cuando pasas: checkPermission(['ENTREGAS:CREAR', 'CHECADOR:VER'])
            if (requiredPermissions && Array.isArray(requiredPermissions)) {
                const hasAll = requiredPermissions.every(p => {
                    const [recurso, accion] = p.split(':');
                    return userPermissions[recurso] && userPermissions[recurso].includes(accion);
                });

                if (hasAll) return next();
                return res.status(403).json({ error: "No tienes los permisos combinados necesarios" });
            }

            // --- CASO B: MODO AUTOMÁTICO (Detección por URL) ---
            // Se usa cuando pones: checkPermission()
            
            // Obtenemos el recurso del final de la URL (ej: /api/entregas -> ENTREGAS)
            const recurso = req.baseUrl.split('/').pop().toUpperCase();
            
            const mapeoAcciones = {
                'GET': req.params.id ? 'VER' : 'LISTAR',
                'POST': 'CREAR',
                'PUT': 'EDITAR',
                'DELETE': 'ELIMINAR'
            };
            
            const accion = mapeoAcciones[req.method];

            // Validación final
            if (userPermissions[recurso] && userPermissions[recurso].includes(accion)) {
                return next();
            }

            return res.status(403).json({ 
                error: `Acceso denegado: No tienes permiso de ${accion} en el módulo ${recurso}` 
            });

        } catch (error) {
            return res.status(401).json({ error: 'Token inválido o sesión expirada' });
        }
    };
};

module.exports = { validarToken, checkPermission };