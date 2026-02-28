const express = require('express');
const router = express.Router();
const aplicacionController = require('../controllers/aplicacionController');
const { validarToken, checkPermission } = require('../middlewares/authMiddleware');

router.get('/', validarToken, checkPermission(),  aplicacionController.getAplicaciones);           // Listar todas
router.get('/:id', validarToken, checkPermission(), aplicacionController.getAplicacionById);     // Ver una
router.post('/', validarToken, checkPermission(), aplicacionController.createAplicacion);        // Crear
router.put('/:id', validarToken, checkPermission(), aplicacionController.updateAplicacion);      // Actualizar
router.delete('/:id', validarToken, checkPermission(), aplicacionController.deleteAplicacion);   // Borrar

module.exports = router;