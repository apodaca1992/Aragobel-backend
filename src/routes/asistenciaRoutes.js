const express = require('express');
const router = express.Router();
const asistenciaController = require('../controllers/asistenciaController');
const { validarToken, checkPermission } = require('../middlewares/authMiddleware');

// GET /api/Asistencias
router.get('/descargarReportePdf', validarToken, checkPermission(), asistenciaController.descargarReportePdf); 
router.get('/generarReporte', validarToken, checkPermission(), asistenciaController.generarReporte); 
router.get('/time', validarToken, asistenciaController.getServerTime);                           //sincronizar el reloj de la App 

// 🌟 NUEVA RUTA: Consulta secuencial de jornada por Tienda y Usuario
// Debe ir aquí arriba para evitar que Express la confunda con '/:id'
router.get('/jornada-actual', validarToken, checkPermission(), asistenciaController.getJornadaActual);

router.get('/', validarToken, checkPermission(), asistenciaController.getAsistencias);           // Listar todas
router.get('/:id', validarToken, checkPermission(), asistenciaController.getAsistenciaById);     // Ver una
router.post('/', validarToken, checkPermission(), asistenciaController.createAsistencia);        // Crear
router.put('/:id', validarToken, checkPermission(), asistenciaController.updateAsistencia);      // Actualizar
router.delete('/:id', validarToken, checkPermission(), asistenciaController.deleteAsistencia);   // Borrar

module.exports = router;