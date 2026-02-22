const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const RolRecursoPermiso = sequelize.define('RolRecursoPermiso', {
    id_rol: {
        type: DataTypes.UUID,
        primaryKey: true,
        references: {
            model: 'roles',
            key: 'id_rol'
        }
    },
    id_recurso: {
        type: DataTypes.UUID,
        primaryKey: true,
        references: {
            model: 'recursos',
            key: 'id_recurso'
        }
    },
    id_permiso: {
        type: DataTypes.UUID,
        primaryKey: true,
        references: {
            model: 'permisos',
            key: 'id_permiso'
        }
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
    tableName: 'roles_recursos_permisos',
    timestamps: true
});

module.exports = RolRecursoPermiso;