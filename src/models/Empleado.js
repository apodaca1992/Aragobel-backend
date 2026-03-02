const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Empleado = sequelize.define('Empleado', {
    id_empleado: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    apellido_paterno: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    apellido_materno: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    id_tienda: {
        type: DataTypes.UUID,
        allowNull: false
    },
    tienda_nombre_snap: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    id_puesto: {
        type: DataTypes.UUID,
        allowNull: false
    },
    puesto_nombre_snap: {
        type: DataTypes.STRING(50),
        allowNull: false
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
    tableName: 'empleados',
    timestamps: true
});

module.exports = Empleado;