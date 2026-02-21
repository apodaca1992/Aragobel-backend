const express = require('express');
const router = express.Router();
const tiendaController = require('../controllers/tiendaController');
const { validarToken, checkPermission } = require('../middlewares/authMiddleware');

// GET /api/tiendas
router.get('/', checkPermission(), validarToken, tiendaController.getTiendas);           // Listar todas
router.get('/:id', checkPermission(), validarToken, tiendaController.getTiendaById);     // Ver una
router.post('/', checkPermission(), validarToken, tiendaController.createTienda);        // Crear
router.put('/:id', checkPermission(), validarToken, tiendaController.updateTienda);      // Actualizar
router.delete('/:id', checkPermission(), validarToken, tiendaController.deleteTienda);   // Borrar

module.exports = router;