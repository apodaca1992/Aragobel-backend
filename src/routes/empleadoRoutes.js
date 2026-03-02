const express = require('express');
const router = express.Router();
const empleadoController = require('../controllers/empleadoController');
const { validarToken, checkPermission } = require('../middlewares/authMiddleware');

const validate = require('../middlewares/validate'); // El que creamos arriba
const { empleadoSchema } = require('../validations/empleado.validation');

router.get('/', validarToken, checkPermission(),  empleadoController.getEmpleados);           // Listar todas
router.get('/:id', validarToken, checkPermission(), empleadoController.getEmpleadoById);     // Ver una
router.post('/', validarToken, checkPermission(), validate(empleadoSchema), empleadoController.createEmpleado);        // Crear
router.put('/:id', validarToken, checkPermission(), validate(empleadoSchema), empleadoController.updateEmpleado);      // Actualizar
router.delete('/:id', validarToken, checkPermission(), empleadoController.deleteEmpleado);   // Borrar

module.exports = router;