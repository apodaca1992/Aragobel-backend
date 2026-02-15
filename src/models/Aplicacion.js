const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Aplicacion = sequelize.define('Aplicacion', {
    id_aplicacion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    descripcion: {
        type: DataTypes.STRING(100),
        allowNull: false
    }
}, {
    tableName: 'aplicaciones',
    timestamps: true,
    paranoid: true
});

module.exports = Aplicacion;