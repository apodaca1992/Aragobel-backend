const { Usuario, Rol, Recurso, Permiso, RolRecursoPermiso } = require('../models');
const cryptoUtils = require('../utils/cryptoUtils');
const JwtUtils = require('../utils/jwtUtils');

const registrar = async (datos) => {
    const hash = await cryptoUtils.hashPassword(datos.contrasena);
    return await Usuario.create({
        ...datos,
        contrasena: hash
    });
};

const login = async (usuario, contrasena) => {
    // 1. Buscar usuario por nombre de usuario
    const user = await Usuario.findOne({ where: { usuario } });
    if (!user) return null;

    // 2. Comparar contraseña (bcrypt maneja el hash)
    const isMatch = await cryptoUtils.comparePassword(contrasena, user.contrasena);
    if (!isMatch) return null;

    // --- NUEVO: Obtener Permisos ---
    const usuarioConPermisos = await Usuario.findByPk(user.id_usuario, {
        include: [{
            model: Rol,
            include: [{
                model: Recurso,
                include: [{
                    model: RolRecursoPermiso, // Ahora sí estará asociado
                    include: [Permiso] // Y aquí sacamos el tipo_permiso
                }]
            }]
        }]
    });
    
    const permisosMap = {};
    if (usuarioConPermisos && usuarioConPermisos.Rols) {
        usuarioConPermisos.Rols.forEach(rol => {
            if (rol.Recursos) {
                rol.Recursos.forEach(recurso => {
                    const nombreRecurso = recurso.nombre; // Ej: "ENTREGAS"
                    
                    if (!permisosMap[nombreRecurso]) {
                        permisosMap[nombreRecurso] = [];
                    }

                    // Navegamos por la tabla intermedia hacia el modelo Permiso
                    if (recurso.RolRecursoPermisos) {
                        recurso.RolRecursoPermisos.forEach(intermedia => {
                            if (intermedia.Permiso) {
                                // Evitamos duplicados si el usuario tiene varios roles con el mismo permiso
                                if (!permisosMap[nombreRecurso].includes(intermedia.Permiso.tipo_permiso)) {
                                    permisosMap[nombreRecurso].push(intermedia.Permiso.tipo_permiso);
                                }
                            }
                        });
                    }
                });
            }
        });
    }

    // Extraemos todos los nombres de los roles y los pasamos a Mayúsculas
    const roles = usuarioConPermisos.Rols.map(r => r.nombre.toUpperCase());

    const token = JwtUtils.generarToken({ 
            id: user.id_usuario, 
            usuario: user.usuario,
            roles: roles,
            permisos: permisosMap // <--- Se agregan aquí
        });

    return { 
        user: { id: user.id_usuario, usuario: user.usuario, roles },
        token,
        permisos: permisosMap // También los devolvemos para el Frontend
    };
};

module.exports = { registrar, login };