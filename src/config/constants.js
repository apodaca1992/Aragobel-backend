/**
 * RECURSOS: Define los módulos existentes en el sistema.
 * Si agregas un módulo nuevo, solo añádelo aquí.
 */
const RECURSOS = {
    ENTREGAS: 'ENTREGAS',
    CHECADOR: 'CHECADOR'/*,
    USUARIOS: 'USUARIOS',
    REPORTES: 'REPORTES',
    CONFIGURACION: 'CONFIGURACION'*/
};

/**
 * ACCIONES: Define qué se puede hacer dentro de cada recurso.
 * Esto mantiene la consistencia en el JSON de permisos.
 */
const ACCIONES = {
    LISTAR: 'LISTAR',
    VER: 'VER',
    CREAR: 'CREAR',
    EDITAR: 'EDITAR',
    ELIMINAR: 'ELIMINAR'
};

// Centralizamos los nombres de los roles y quiénes son "Súper"
const ROLES = {
    ADMINISTRADOR: 'ADMINISTRADOR',
    ADMIN: 'ADMIN',
    SUPERADMIN: 'SUPERADMIN',
    ROOT: 'ROOT'
};

const SUPER_ROLES = [
    ROLES.ADMINISTRADOR,
    ROLES.ADMIN,
    ROLES.SUPERADMIN,
    ROLES.ROOT
];

module.exports = {
    RECURSOS,
    ACCIONES,
    ROLES,
    SUPER_ROLES,
    // Helper para obtener arrays (útil para validaciones o el formulario)
    LISTA_RECURSOS: Object.values(RECURSOS),
    LISTA_ACCIONES: Object.values(ACCIONES)
};