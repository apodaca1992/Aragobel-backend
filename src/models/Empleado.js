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
        allowNull: true,
        validate: {
            isEmail: true // Validación básica de formato de correo
        }
    },
    id_tienda: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'tiendas',
            key: 'id_tienda'
        }
    },
    id_puesto: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'puestos',
            key: 'id_puesto'
        }
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true // Por defecto, todo lo nuevo está activo
    }
}, {
    tableName: 'empleados',
    timestamps: true
});

module.exports = Empleado;