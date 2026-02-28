const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validarToken, checkPermission } = require('../middlewares/authMiddleware');

router.post('/register', validarToken, checkPermission(), authController.register);
router.post('/login', authController.login);

module.exports = router;