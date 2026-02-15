require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/db');

const PORT = process.env.PORT || 3000;

async function main() {
    try {
        // Autenticar la conexión a MariaDB (EntityManager check)
        await sequelize.authenticate();
        console.log('✅ Conexión a MariaDB establecida correctamente (ORM).');

        app.listen(PORT, () => {
            console.log(`Servidor corriendo en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('No se pudo conectar a la base de datos:', error);
    }
}

main();