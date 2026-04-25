const express = require('express');
const router = express.Router();
const entregaController = require('../controllers/entregaController');
const { validarToken, checkPermission } = require('../middlewares/authMiddleware');

// GET /api/Entregas
router.get('/', validarToken, checkPermission(), entregaController.getEntregas);           // Listar todas
router.get('/:id', validarToken, checkPermission(), entregaController.getEntregaById);     // Ver una
router.post('/', validarToken, checkPermission(), entregaController.createEntrega);        // Crear
router.put('/:id', validarToken, checkPermission(), entregaController.updateEntrega);      // Actualizar
router.delete('/:id', validarToken, checkPermission(), entregaController.deleteEntrega);   // Borrar

module.exports = router;