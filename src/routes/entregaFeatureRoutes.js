const express = require('express');
const router = express.Router();
const { validarToken, checkPermission } = require('../middlewares/authMiddleware');
const entregaFeatureController = require('../controllers/entregaFeatureController');

// El middleware valida que tenga permiso de LISTAR
// El controlador decide QUÉ listar
router.get('/', validarToken, checkPermission(), entregaFeatureController.getEntregas);

module.exports = router;