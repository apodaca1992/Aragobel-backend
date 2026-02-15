const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME, 
    process.env.DB_USER, 
    process.env.DB_PASSWORD, 
    {
        host: process.env.DB_HOST,
        dialect: 'mariadb',
        logging: false, // Para que no llene la consola de SQL puro
        define: {
            timestamps: false // Para que no busque las columnas 'createdAt' y 'updatedAt' automáticamente
        }
    }
);

module.exports = sequelize;