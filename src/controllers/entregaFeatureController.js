const entregaFeatureService = require('../services/entregaFeatureService');

const getEntregas = async (req, res) => {
    try {
        // Extraemos lo necesario del token (puesto por el middleware)
        const { id, roles } = req.user;

        // LLAMADA AL SERVICIO
        const result = await entregaFeatureService.listarEntregasService(id, roles);

        return res.status(200).json({
            count: result.entregas.length,
            rol_aplicado: result.esAdmin ? 'ADMINISTRADOR' : 'USUARIO_ESTANDAR',
            data: result.entregas
        });

    } catch (error) {
        return res.status(500).json({ error: error.message || 'Error al listar entregas' });
    }
};

module.exports = { getEntregas };