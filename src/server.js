require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/db');
const { setupAssociations } = require('./models/associations');

const PORT = process.env.PORT || 3000;

async function main() {
    try {
        // Autenticar la conexión a MariaDB (EntityManager check)
        await sequelize.authenticate();
        console.log('✅ Conexión a MariaDB establecida correctamente (ORM).');

        // Configurar asociaciones en las tablas de la base de datos
        await setupAssociations();
        // Luego sincronizar
        sequelize.sync({ alter: false }).then(() => {
            console.log('Tablas y asociaciones configuradas correctamente');
        });

        app.listen(PORT, () => {
            console.log(`Servidor corriendo en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('No se pudo conectar a la base de datos:', error);
    }
}

main();