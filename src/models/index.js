const sequelize = require('../config/db'); // Tu conexión a Sequelize
const { syncSnapshots } = require('../utils/syncSnapshots'); // Tu función de Snaps

// 1. Importación de Modelos
const Usuario = require('./Usuario');
const Empleado = require('./Empleado');
const Rol = require('./Rol');
const Tienda = require('./Tienda');
const Puesto = require('./Puesto');
const UsuarioRol = require('./UsuarioRol');


// 1. Relación: Empleado <-> Tienda y Puesto
Tienda.hasMany(Empleado, { foreignKey: 'id_tienda' });
Empleado.belongsTo(Tienda, { foreignKey: 'id_tienda' });

Puesto.hasMany(Empleado, { foreignKey: 'id_puesto' });
Empleado.belongsTo(Puesto, { foreignKey: 'id_puesto' });

// 2. Relación: Usuario <-> Empleado (1:1)
Empleado.hasOne(Usuario, { foreignKey: 'id_empleado' });
Usuario.belongsTo(Empleado, { foreignKey: 'id_empleado' });

// 3. Relación: Usuario <-> Roles (N:M)
Usuario.belongsToMany(Rol, { 
    through: UsuarioRol, 
    foreignKey: 'id_usuario', 
    otherKey: 'id_rol' 
});
Rol.belongsToMany(Usuario, { 
    through: UsuarioRol, 
    foreignKey: 'id_rol', 
    otherKey: 'id_usuario' 
});

syncSnapshots(Tienda, Empleado, 'id_tienda', {
    'nombre': 'tienda_nombre_snap'
});
syncSnapshots(Puesto, Empleado, 'id_puesto', {
    'nombre': 'puesto_nombre_snap'
});

// 4. Exportación del Objeto DB
// Esto permite importar todo con: const { Recurso, Aplicacion } = require('../models');
module.exports = {
    sequelize,
    Usuario,
    Empleado,
    Rol,
    Tienda,
    Puesto,
    UsuarioRol
};