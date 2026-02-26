const express = require('express');
const router = express.Router();
const aplicacionController = require('../controllers/aplicacionController');
const { validarToken, checkPermission } = require('../middlewares/authMiddleware');

router.get('/', checkPermission(), validarToken, aplicacionController.getAplicaciones);           // Listar todas
router.get('/:id', checkPermission(), validarToken, aplicacionController.getAplicacionById);     // Ver una
router.post('/', checkPermission(), validarToken, aplicacionController.createAplicacion);        // Crear
router.put('/:id', checkPermission(), validarToken, aplicacionController.updateAplicacion);      // Actualizar
router.delete('/:id', checkPermission(), validarToken, aplicacionController.deleteAplicacion);   // Borrar

module.exports = router;