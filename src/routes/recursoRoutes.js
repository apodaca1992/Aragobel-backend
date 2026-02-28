const express = require('express');
const router = express.Router();
const recursoController = require('../controllers/recursoController');
const { validarToken, checkPermission } = require('../middlewares/authMiddleware');

// GET /api/recursos
router.get('/', checkPermission(), validarToken, recursoController.getRecursos);           // Listar todas
router.get('/:id', checkPermission(), validarToken, recursoController.getRecursoById);    // Ver una
router.post('/', checkPermission(), validarToken, recursoController.createRecurso);      // Crear
router.put('/:id', checkPermission(), validarToken, recursoController.updateRecurso);     // Actualizar
router.delete('/:id', checkPermission(), validarToken, recursoController.deleteRecurso);  // Borrar

module.exports = router;