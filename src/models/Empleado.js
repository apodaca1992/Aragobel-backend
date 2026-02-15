const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Empleado = sequelize.define('Empleado', {
    id_empleado: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
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
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'tiendas',
            key: 'id_tienda'
        }
    },
    id_puesto: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'puestos',
            key: 'id_puesto'
        }
    }
}, {
    tableName: 'empleados',
    timestamps: true,
    paranoid: true
});

module.exports = Empleado;