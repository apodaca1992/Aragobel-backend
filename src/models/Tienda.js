const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Tienda = sequelize.define('Tienda', {
    id_tienda: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
    },
    nombre: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    latitud: DataTypes.STRING(50),
    longitud: DataTypes.STRING(50),
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true // Por defecto, todo lo nuevo está activo
    }
}, {
    tableName: 'tiendas', // Nombre exacto de tu tabla en MariaDB
    timestamps: true, // Para que busque createdAt/updatedAt
});

module.exports = Tienda;