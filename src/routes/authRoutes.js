const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validarToken, checkPermission } = require('../middlewares/authMiddleware');

const validate = require('../middlewares/validate'); // El que creamos arriba
const { usuarioSchema } = require('../validations/usuario.validation');

router.post('/register', validarToken, checkPermission(), validate(usuarioSchema), authController.register);
router.post('/login', authController.login);

module.exports = router;