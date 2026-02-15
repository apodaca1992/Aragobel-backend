const express = require('express');
const router = express.Router();
const tiendaController = require('../controllers/tiendaController');
const { validarToken } = require('../middlewares/authMiddleware');

// GET /api/tiendas
router.get('/', validarToken, tiendaController.getTiendas);           // Listar todas
router.get('/:id', validarToken, tiendaController.getTiendaById);     // Ver una
router.post('/', validarToken, tiendaController.createTienda);        // Crear
router.put('/:id', validarToken,tiendaController.updateTienda);      // Actualizar
router.delete('/:id', validarToken, tiendaController.deleteTienda);   // Borrar

module.exports = router;