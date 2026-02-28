const sequelize = require('../config/db'); // Tu conexión a Sequelize
const { syncSnapshots } = require('../utils/syncSnapshots'); // Tu función de Snaps

// 1. Importación de Modelos
const Usuario = require('./Usuario');
const Empleado = require('./Empleado');
const Rol = require('./Rol');
const Aplicacion = require('./Aplicacion');
const Recurso = require('./Recurso');
const Permiso = require('./Permiso');
const Tienda = require('./Tienda');
const Puesto = require('./Puesto');
const UsuarioRol = require('./UsuarioRol');
const RolRecursoPermiso = require('./RolRecursoPermiso');


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

// 4. Relación: Aplicación <-> Recurso (1:N)
Aplicacion.hasMany(Recurso, { foreignKey: 'id_aplicacion' });
Recurso.belongsTo(Aplicacion, { foreignKey: 'id_aplicacion' });

// 5. Relación Ternaria: Roles <-> Recursos <-> Permisos (N:M:P)
// Nota: Usamos el modelo RolRecursoPermiso para unir las tres tablas
Rol.belongsToMany(Recurso, { through: RolRecursoPermiso, foreignKey: 'id_rol' });
Recurso.belongsToMany(Rol, { through: RolRecursoPermiso, foreignKey: 'id_recurso' });

// NUEVO: Puentes directos para que el "include" funcione desde el Recurso
Recurso.hasMany(RolRecursoPermiso, { foreignKey: 'id_recurso' });
RolRecursoPermiso.belongsTo(Recurso, { foreignKey: 'id_recurso' });

// (Opcional pero recomendado) Puente desde Rol
Rol.hasMany(RolRecursoPermiso, { foreignKey: 'id_rol' });
RolRecursoPermiso.belongsTo(Rol, { foreignKey: 'id_rol' });

// Conectamos la tabla intermedia con Permisos para poder saber qué acción se permite
RolRecursoPermiso.belongsTo(Permiso, { foreignKey: 'id_permiso' });
Permiso.hasMany(RolRecursoPermiso, { foreignKey: 'id_permiso' });

RolRecursoPermiso.belongsTo(Rol, { foreignKey: 'id_rol' });
RolRecursoPermiso.belongsTo(Recurso, { foreignKey: 'id_recurso' });

// 6. Configuración de Snaps Automáticos
syncSnapshots(Aplicacion, Recurso, 'id_aplicacion', {
    'nombre': 'aplicacion_nombre_snap'
    // 'icono': 'aplicacion_icono_snap' <-- Si mañana agregas otro, solo lo pones aquí
});

// 4. Exportación del Objeto DB
// Esto permite importar todo con: const { Recurso, Aplicacion } = require('../models');
module.exports = {
    sequelize,
    Usuario,
    Empleado,
    Rol,
    Aplicacion,
    Recurso,
    Permiso,
    Tienda,
    Puesto,
    UsuarioRol,
    RolRecursoPermiso
};