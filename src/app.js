const express = require('express');
const app = express();

// Rutas (las crearemos en un momento)
const tiendaRoutes = require('./routes/tiendaRoutes');

// Middlewares para entender JSON
app.use(express.json());

// Endpoint de prueba rápido
app.get('/', (req, res) => {
    res.json({ mensaje: "API de Aragobel funcionando" });
});

// Unir las rutas de las entidades
app.use('/api/tiendas', tiendaRoutes);

module.exports = app;