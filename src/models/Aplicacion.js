const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Aplicacion = sequelize.define('Aplicacion', {
    id_aplicacion: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    descripcion: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true // Por defecto, todo lo nuevo está activo
    }
}, {
    tableName: 'aplicaciones',
    timestamps: true
});

module.exports = Aplicacion;