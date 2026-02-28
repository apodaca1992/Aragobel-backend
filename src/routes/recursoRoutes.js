const express = require('express');
const router = express.Router();
const recursoController = require('../controllers/recursoController');
const { validarToken, checkPermission } = require('../middlewares/authMiddleware');

// GET /api/recursos
router.get('/', validarToken, checkPermission(), recursoController.getRecursos);           // Listar todas
router.get('/:id', validarToken, checkPermission(), recursoController.getRecursoById);    // Ver una
router.post('/', validarToken, checkPermission(), recursoController.createRecurso);      // Crear
router.put('/:id', validarToken, checkPermission(), recursoController.updateRecurso);     // Actualizar
router.delete('/:id', validarToken, checkPermission(), recursoController.deleteRecurso);  // Borrar

module.exports = router;