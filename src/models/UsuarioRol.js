const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const UsuarioRol = sequelize.define('UsuarioRol', {
    id_usuario: {
        type: DataTypes.UUID,
        primaryKey: true
    },
    id_rol: {
        type: DataTypes.UUID,
        primaryKey: true
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true // Por defecto, todo lo nuevo está activo
    },
    // Agregamos la columna para registrar la fecha de eliminación lógica
    deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
    }
}, {
    tableName: 'usuarios_roles',
    timestamps: true
});

module.exports = UsuarioRol;