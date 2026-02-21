const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Recurso = sequelize.define('Recurso', {
    id_recurso: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    id_aplicacion: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'aplicaciones', // Nombre de la tabla en la DB
            key: 'id_aplicacion'
        }
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true // Por defecto, todo lo nuevo está activo
    }
}, {
    tableName: 'recursos',
    timestamps: true
});

module.exports = Recurso;