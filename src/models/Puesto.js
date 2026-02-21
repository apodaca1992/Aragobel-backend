const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Puesto = sequelize.define('Puesto', {
    id_puesto: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
    },
    nombre: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true // Por defecto, todo lo nuevo está activo
    }
}, {
    tableName: 'puestos',
    timestamps: true
});

module.exports = Puesto;