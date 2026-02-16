//const Usuario = require('../models/Usuario'); // Asegúrate de tener este modelo
// IMPORTANTE: Importamos desde associations, no desde models directamente
const { Usuario, Rol, Recurso, Permiso, RolRecursoPermiso } = require('../models/associations');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const registrar = async (datos) => {
    // 1. Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(datos.contrasena, salt);
    
    // 2. Sobrescribir la contraseña con el hash y crear
    return await Usuario.create({
        ...datos,
        contrasena: hash
    });
};

const login = async (usuario, contrasena) => {
    // 1. Buscar usuario por nombre de usuario
    const user = await Usuario.findOne({ where: { usuario } });
    if (!user) throw new Error('Usuario no encontrado');

    // 2. Comparar contraseña (bcrypt maneja el hash)
    const isMatch = await bcrypt.compare(contrasena, user.contrasena);
    if (!isMatch) throw new Error('Contraseña incorrecta');

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

    // 3. Generar Token
    const token = jwt.sign(
        { 
            id: user.id_usuario, 
            usuario: user.usuario,
            roles: roles,
            permisos: permisosMap // <--- Se agregan aquí
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return { 
        user: { id: user.id_usuario, usuario: user.usuario, roles },
        token,
        permisos: permisosMap // También los devolvemos para el Frontend
    };
};

const obtenerPermisosUsuario = async (id_usuario) => {
    try {
        const usuarioConPermisos = await Usuario.findByPk(id_usuario, {
            include: [{
                model: Rol,
                through: { attributes: [] }, // No queremos los datos de la tabla intermedia usuarios_roles
                include: [{
                    model: Recurso,
                    through: { attributes: [] }, // No queremos los datos de roles_recursos_permisos
                    include: [{
                        model: Permiso,
                        // Aquí es donde traemos los nombres de los permisos (VER, CREAR, etc.)
                    }]
                }]
            }]
        });

        if (!usuarioConPermisos) return null;

        // Formatear la respuesta para que sea fácil de usar en el Frontend
        const permisosFormateados = {};

        usuarioConPermisos.Rols.forEach(rol => {
            rol.Recursos.forEach(recurso => {
                if (!permisosFormateados[recurso.nombre]) {
                    permisosFormateados[recurso.nombre] = [];
                }
                // Agregamos los tipos de permiso (VER, CREAR...) al recurso correspondiente
                recurso.Permisos.forEach(p => {
                    if (!permisosFormateados[recurso.nombre].includes(p.tipo_permiso)) {
                        permisosFormateados[recurso.nombre].push(p.tipo_permiso);
                    }
                });
            });
        });

        return permisosFormateados;
    } catch (error) {
        console.error("Error al obtener permisos:", error);
        throw error;
    }
};

module.exports = { registrar, login, obtenerPermisosUsuario };