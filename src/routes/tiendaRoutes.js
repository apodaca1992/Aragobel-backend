const express = require('express');
const router = express.Router();
const tiendaController = require('../controllers/tiendaController');
const { validarToken, checkPermission } = require('../middlewares/authMiddleware');

// GET /api/tiendas
router.get('/', validarToken, checkPermission(), tiendaController.getTiendas);           // Listar todas
router.get('/:id', validarToken, checkPermission(), tiendaController.getTiendaById);     // Ver una
router.post('/', validarToken, checkPermission(), tiendaController.createTienda);        // Crear
router.put('/:id', validarToken, checkPermission(), tiendaController.updateTienda);      // Actualizar
router.delete('/:id', validarToken, checkPermission(), tiendaController.deleteTienda);   // Borrar

module.exports = router;