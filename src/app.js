const express = require('express');
const cors = require('cors');
const app = express();
const globalErrorHandler = require('./middlewares/errorMiddleware');

// Rutas (las crearemos en un momento)
const authRoutes = require('./routes/authRoutes');
const tiendaRoutes = require('./routes/tiendaRoutes');
const entregaFeatureRoutes = require('./routes/entregaFeatureRoutes');
const empleadoRoutes = require('./routes/empleadoRoutes');
const rolRoutes = require('./routes/rolRoutes');

// Configuración básica (Permite todo - Solo para desarrollo local)
app.use(cors({
  origin: 'http://localhost:4200' // La URL de tu app Ionic
}));
// Middlewares para entender JSON
app.use(express.json());

// Endpoint de prueba rápido
app.get('/', (req, res) => {
    res.json({ mensaje: "API de Aragobel funcionando" });
});

// Unir las rutas de las entidades
app.use('/api/auth', authRoutes); // Prefijo para login, registro, etc.
app.use('/api/tiendas', tiendaRoutes);
app.use('/api/entregas', entregaFeatureRoutes);
app.use('/api/empleados', empleadoRoutes);
app.use('/api/roles', rolRoutes);

// ESTE DEBE SER EL ÚLTIMO MIDDLEWARE
app.use(globalErrorHandler);

module.exports = app;