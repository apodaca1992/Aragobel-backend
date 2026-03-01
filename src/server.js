require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/db');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;
const ENV = process.env.NODE_ENV || 'development';

async function main() {
    try {
        logger.info(`Iniciando servidor en modo: ${ENV}`);
        // Autenticar la conexión a MariaDB (EntityManager check)
        await sequelize.authenticate();
        logger.info('✅ Conexión a MariaDB establecida correctamente (ORM).');

        await sequelize.sync({ alter: false });
        logger.info('Tablas y asociaciones configuradas correctamente.');

        const server = app.listen(PORT, () => {
            logger.info(`Servidor corriendo en puerto: ${PORT}`);
            logger.info(`URL: http://localhost:${PORT}`);
        });

        process.on('unhandledRejection', (err) => {
            logger.error('UNHANDLED REJECTION! Cerrando aplicación...', {
                message: err.message,
                stack: err.stack
            });
            // Cerramos el servidor suavemente antes de matar el proceso
            server.close(() => {
                process.exit(1);
            });
        });
    } catch (error) {
        logger.error('Error crítico durante el inicio de la aplicación:', {
            message: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
}

main();