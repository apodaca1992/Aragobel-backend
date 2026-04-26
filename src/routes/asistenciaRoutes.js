const express = require('express');
const router = express.Router();
const asistenciaController = require('../controllers/asistenciaController');
const { validarToken, checkPermission } = require('../middlewares/authMiddleware');

// GET /api/Asistencias
router.get('/time', validarToken, asistenciaController.getServerTime);                           //sincronizar el reloj de la App 
router.get('/', validarToken, checkPermission(), asistenciaController.getAsistencias);           // Listar todas
router.get('/:id', validarToken, checkPermission(), asistenciaController.getAsistenciaById);     // Ver una
router.post('/', validarToken, checkPermission(), asistenciaController.createAsistencia);        // Crear
router.put('/:id', validarToken, checkPermission(), asistenciaController.updateAsistencia);      // Actualizar
router.delete('/:id', validarToken, checkPermission(), asistenciaController.deleteAsistencia);   // Borrar

module.exports = router;