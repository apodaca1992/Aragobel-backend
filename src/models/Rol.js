const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const { DB_CONFIG } = require('../config/constants');

const Rol = sequelize.define('Rol', {
    id_rol: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    descripcion: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    permisos: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {}
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
    tableName: 'roles',
    timestamps: true,
    hooks: {
        afterUpdate: async (rol, options) => {
            if (rol.changed('permisos')) {
                const { Usuario, UsuarioRol } = sequelize.models;
                const vinculaciones = await UsuarioRol.findAll({
                    where: { id_rol: rol.id_rol },
                    attributes: ['id_usuario'],
                    transaction: options.transaction
                });

                if (vinculaciones.length > 0) {
                    console.log(`[HOOK] Actualizando ${vinculaciones.length} usuarios...`);

                    // Definimos un tamaño de lote (chunk)
                    const tamañoLote = DB_CONFIG.BATCH_SIZE; 
                    
                    for (let i = 0; i < vinculaciones.length; i += tamañoLote) {
                        const lote = vinculaciones.slice(i, i + tamañoLote);
                        
                        await Promise.all(lote.map(async vinc => {
                            const user = await Usuario.findByPk(vinc.id_usuario, { 
                                transaction: options.transaction 
                            });
                            if (user) await user.actualizarCachePermisos(options.transaction);
                        }));
                    }
                }
            }
        }
    }
});

module.exports = Rol;