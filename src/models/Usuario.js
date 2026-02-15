const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
//const Empleado = require('./Empleado'); // Importamos el modelo de Empleado para la relación

const Usuario = sequelize.define('Usuario', {
    id_usuario: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
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
        type: DataTypes.INTEGER,
        allowNull: false,
        /*references: {
            model: 'empleados', // Nombre de la tabla en la DB
            key: 'id_empleado'
        }*/
    }
}, {
    tableName: 'usuarios',
    timestamps: true, // Para que busque createdAt/updatedAt,
    paranoid: true // <--- ESTO ACTIVA EL BORRADO LÓGICO
});

// Definir la relación (Asociación)
//Usuario.belongsTo(Empleado, { foreignKey: 'id_empleado' });

module.exports = Usuario;