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
    permisos: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {}
    },
    roles: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: []
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

// --- MÉTODO DE INSTANCIA PARA SINCRONIZAR CACHÉ PERMISOS Y ROLES---
Usuario.prototype.actualizarCachePermisos = async function(transaction = null) {
    // Importamos Rol aquí para evitar problemas de carga circular
    const { Rol, UsuarioRol } = sequelize.models;

    // 1. Obtener los roles activos del usuario
    const vinculaciones = await UsuarioRol.findAll({
        where: { id_usuario: this.id_usuario },
        attributes: ['id_rol'],
        transaction
    });

    const idsRoles = vinculaciones.map(v => v.id_rol);
    
    // 3. Si no tiene roles, limpiamos los campos y salimos
    if (idsRoles.length === 0) {
        return await this.update({ roles: [], permisos: {} }, { transaction });
    }

    // 4. Traemos los datos de los roles (solo los activos)
    const rolesActivos = await Rol.findAll({
        where: { 
            id_rol: idsRoles,
            activo: true 
        },
        transaction
    });

    const permisosMap = {};
    const rolesList = [];

    // 2. Unificar permisos y nombres de roles
    rolesActivos.forEach(rol => {
        rolesList.push(rol.nombre.toUpperCase());
        
        const config = rol.permisos || {};
        Object.entries(config).forEach(([recurso, acciones]) => {
            if (!permisosMap[recurso]) {
                permisosMap[recurso] = new Set();
            }
            if (Array.isArray(acciones)) {
                acciones.forEach(accion => permisosMap[recurso].add(accion));
            }
        });
    });

    // 3. Formatear para persistencia JSON
    const permisosFinales = {};
    Object.keys(permisosMap).forEach(recurso => {
        permisosFinales[recurso] = Array.from(permisosMap[recurso]);
    });

    // 4. Guardar cambios en la instancia
    return await this.update({
        roles: rolesList,
        permisos: permisosFinales
    }, { transaction });
};

module.exports = Usuario;