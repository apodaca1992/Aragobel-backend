const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const RolRecursoPermiso = sequelize.define('RolRecursoPermiso', {
    id_rol: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
            model: 'roles',
            key: 'id_rol'
        }
    },
    id_recurso: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
            model: 'recursos',
            key: 'id_recurso'
        }
    },
    id_permiso: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
            model: 'permisos',
            key: 'id_permiso'
        }
    }
}, {
    tableName: 'roles_recursos_permisos',
    timestamps: true,
    paranoid: true // Siguiendo tu lógica de borrado lógico
});

module.exports = RolRecursoPermiso;