const express = require('express');
const cors = require('cors');
const app = express();
const globalErrorHandler = require('./middlewares/errorMiddleware');

// Rutas (las crearemos en un momento)
const authRoutes = require('./routes/authRoutes');
const tiendaRoutes = require('./routes/tiendaRoutes');
const entregaFeatureRoutes = require('./routes/entregaFeatureRoutes');
const rolRoutes = require('./routes/rolRoutes');


const whiteList = [
    'http://localhost',          // Origen predeterminado de Capacitor en Android
    'capacitor://localhost',     // Origen predeterminado de Capacitor en iOS
    'http://localhost:8100',     // Para cuando corres 'ionic serve' en tu PC
    'http://localhost:4200'      // Por si usas Angular puro para pruebas
];

const corsOptions = {
    origin: function (origin, callback) {
        // Permitimos peticiones sin origen (como Postman o servidores locales)
        // o si el origen está en nuestra lista blanca
        if (!origin || whiteList.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // Error de seguridad si alguien intenta entrar desde otro dominio
            callback(new Error('No permitido por CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true // Importante si manejas cookies o sesiones
};

// Configuración básica (Permite todo - Solo para desarrollo local)
app.use(cors(corsOptions));
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
app.use('/api/roles', rolRoutes);

// ESTE DEBE SER EL ÚLTIMO MIDDLEWARE
app.use(globalErrorHandler);

module.exports = app;