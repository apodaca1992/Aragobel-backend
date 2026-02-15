const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Puesto = sequelize.define('Puesto', {
    id_puesto: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(50),
        allowNull: false
    }
}, {
    tableName: 'puestos',
    timestamps: true,
    paranoid: true
});

module.exports = Puesto;