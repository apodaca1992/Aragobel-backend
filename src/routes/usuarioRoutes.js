const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { validarToken, checkPermission } = require('../middlewares/authMiddleware');

const validate = require('../middlewares/validate'); // El que creamos arriba
const { usuarioSchema } = require('../validations/usuario.validation');

// GET /api/usuarios
router.get('/', validarToken, checkPermission(), usuarioController.getUsuarios);           // Listar todas
router.get('/:id', validarToken, checkPermission(), usuarioController.getUsuarioById);     // Ver una
router.post('/', validarToken, checkPermission(), validate(usuarioSchema), usuarioController.createUsuario);        // Crear
router.put('/:id', validarToken, checkPermission(), usuarioController.updateUsuario);      // Actualizar
router.delete('/:id', validarToken, checkPermission(), usuarioController.deleteUsuario);   // Borrar

module.exports = router;