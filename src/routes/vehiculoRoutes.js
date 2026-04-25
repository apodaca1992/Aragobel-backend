const express = require('express');
const router = express.Router();
const vehiculoController = require('../controllers/vehiculoController');
const { validarToken, checkPermission } = require('../middlewares/authMiddleware');

// GET /api/vehiculos
router.get('/', validarToken, checkPermission(), vehiculoController.getVehiculos);           // Listar todas
router.get('/:id', validarToken, checkPermission(), vehiculoController.getVehiculoById);     // Ver una
router.post('/', validarToken, checkPermission(), vehiculoController.createVehiculo);        // Crear
router.put('/:id', validarToken, checkPermission(), vehiculoController.updateVehiculo);      // Actualizar
router.delete('/:id', validarToken, checkPermission(), vehiculoController.deleteVehiculo);   // Borrar

module.exports = router;