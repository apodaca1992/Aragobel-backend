const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const UsuarioRol = sequelize.define('UsuarioRol', {
    id_usuario: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: { model: 'usuarios', key: 'id_usuario' }
    },
    id_rol: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: { model: 'roles', key: 'id_rol' }
    }
}, {
    tableName: 'usuarios_roles',
    timestamps: true,
    paranoid: true
});

module.exports = UsuarioRol;