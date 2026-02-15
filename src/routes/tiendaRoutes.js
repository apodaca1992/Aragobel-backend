const express = require('express');
const router = express.Router();
const tiendaController = require('../controllers/tiendaController');

// GET /api/tiendas
router.get('/', tiendaController.getTiendas);           // Listar todas
router.get('/:id', tiendaController.getTiendaById);     // Ver una
router.post('/', tiendaController.createTienda);        // Crear
router.put('/:id', tiendaController.updateTienda);      // Actualizar
router.delete('/:id', tiendaController.deleteTienda);   // Borrar

module.exports = router;