const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validarToken } = require('../middlewares/authMiddleware');

router.post('/register', validarToken, authController.register);
router.post('/login', authController.login);

module.exports = router;