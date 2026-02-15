const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Tienda = sequelize.define('Tienda', {
    id_tienda: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    latitud: DataTypes.STRING(50),
    longitud: DataTypes.STRING(50)
}, {
    tableName: 'tiendas' // Nombre exacto de tu tabla en MariaDB
});

module.exports = Tienda;