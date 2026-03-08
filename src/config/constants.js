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

/**
 * CONFIGURACIÓN DE INFRAESTRUCTURA
 * Centralizamos los límites para SQL y el futuro Firestore.
 */
const DB_CONFIG = {
    // 50 para SQL (evita saturar pool), 500 para Firestore (límite Google)
    BATCH_SIZE: process.env.DB_TYPE === 'FIRESTORE' ? 500 : 50,
    
    // Tiempo de espera para procesos pesados (ms)
    SYNC_TIMEOUT: 15000 
};

module.exports = {
    RECURSOS,
    ACCIONES,
    ROLES,
    SUPER_ROLES,
    DB_CONFIG,
    // Helper para obtener arrays (útil para validaciones o el formulario)
    LISTA_RECURSOS: Object.values(RECURSOS),
    LISTA_ACCIONES: Object.values(ACCIONES)
};