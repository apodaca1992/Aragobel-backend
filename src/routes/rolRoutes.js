const express = require('express');
const router = express.Router();
const rolController = require('../controllers/rolController');
const { validarToken, checkPermission } = require('../middlewares/authMiddleware');

const validate = require('../middlewares/validate'); // El que creamos arriba
const { rolSchema } = require('../validations/rol.validation');

// GET /api/Roles
router.get('/', validarToken, checkPermission(), rolController.getRoles);           // Listar todas
router.get('/:id', validarToken, checkPermission(), rolController.getRolById);     // Ver una
router.post('/', validarToken, checkPermission(), validate(rolSchema), rolController.createRol);        // Crear
router.put('/:id', validarToken, checkPermission(), validate(rolSchema), rolController.updateRol);      // Actualizar
router.delete('/:id', validarToken, checkPermission(), rolController.deleteRol);   // Borrar

module.exports = router;