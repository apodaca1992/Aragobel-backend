const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Recurso = sequelize.define('Recurso', {
    id_recurso: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    id_aplicacion: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'aplicaciones', // Nombre de la tabla en la DB
            key: 'id_aplicacion'
        }
    }
}, {
    tableName: 'recursos',
    timestamps: true,
    paranoid: true
});

module.exports = Recurso;