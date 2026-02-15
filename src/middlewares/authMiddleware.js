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

module.exports = { validarToken };