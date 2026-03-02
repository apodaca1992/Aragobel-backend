const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
//const Empleado = require('./Empleado'); // Importamos el modelo de Empleado para la relación

const Usuario = sequelize.define('Usuario', {
    id_usuario: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
    },
    usuario: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    contrasena: {
        type: DataTypes.STRING(255), // Recomendado 255 para hashes de bcrypt
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    id_empleado: {
        type: DataTypes.UUID,
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
    tableName: 'usuarios',
    timestamps: true // Para que busque createdAt/updatedAt,
});

// Definir la relación (Asociación)
//Usuario.belongsTo(Empleado, { foreignKey: 'id_empleado' });

module.exports = Usuario;