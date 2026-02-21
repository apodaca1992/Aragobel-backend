const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const UsuarioRol = sequelize.define('UsuarioRol', {
    id_usuario: {
        type: DataTypes.UUID,
        primaryKey: true,
        references: { model: 'usuarios', key: 'id_usuario' }
    },
    id_rol: {
        type: DataTypes.UUID,
        primaryKey: true,
        references: { model: 'roles', key: 'id_rol' }
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true // Por defecto, todo lo nuevo está activo
    }
}, {
    tableName: 'usuarios_roles',
    timestamps: true
});

module.exports = UsuarioRol;