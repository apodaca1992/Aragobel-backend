const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Permiso = sequelize.define('Permiso', {
    id_permiso: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tipo_permiso: {
        type: DataTypes.STRING(100),
        allowNull: false
    }
}, {
    tableName: 'permisos',
    timestamps: true,
    paranoid: true
});

module.exports = Permiso;