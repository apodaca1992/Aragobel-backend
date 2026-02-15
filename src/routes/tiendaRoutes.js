const express = require('express');
const router = express.Router();
const tiendaController = require('../controllers/tiendaController');

// GET /api/tiendas
router.get('/', tiendaController.getTiendas);

module.exports = router;