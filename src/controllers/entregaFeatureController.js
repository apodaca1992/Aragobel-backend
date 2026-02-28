const entregaFeatureService = require('../services/entregaFeatureService');
const catchAsync = require('../utils/catchAsync');

exports.getEntregas = catchAsync(async (req, res, next) => {
    // LLAMADA AL SERVICIO
    const result = await entregaFeatureService.listarEntregasService(req.user);

    return res.status(200).json({
        count: result.entregas.length,
        data: result.entregas
    });
});