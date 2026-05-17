const express = require('express');
const router = express.Router();
const coloniaController = require('../controllers/coloniaController');
const { validarToken, checkPermission } = require('../middlewares/authMiddleware');

// GET /api/colonias
router.get('/', validarToken, checkPermission(), coloniaController.getColonias);           // Listar todas
router.get('/:id', validarToken, checkPermission(), coloniaController.getColoniaById);     // Ver una
router.post('/', validarToken, checkPermission(), coloniaController.createColonia);        // Crear
router.put('/:id', validarToken, checkPermission(), coloniaController.updateColonia);      // Actualizar
router.delete('/:id', validarToken, checkPermission(), coloniaController.deleteColonia);   // Borrar

module.exports = router;