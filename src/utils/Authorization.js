// src/utils/Authorization.js
class Authorization {
    /**
     * Define los roles que tienen acceso total al sistema
     */
    static get SUPER_ROLES() {
        return ['ADMINISTRADOR', 'ADMIN', 'ROOT','SUPERADMIN'];
    }

    /**
     * Mapea métodos HTTP a acciones de negocio
     */
    static getActionByMethod(method, hasId = false) {
        const mapping = {
            'GET': hasId ? 'VER' : 'LISTAR',
            'POST': 'CREAR',
            'PUT': 'EDITAR',
            'DELETE': 'ELIMINAR'
        };
        return mapping[method.toUpperCase()] || null;
    }

    /**
     * Valida si el usuario es administrador
     */
    static isAdmin(user) {
        if (!user || !user.roles) return false;
        return user.roles.some(rol => this.SUPER_ROLES.includes(rol.toUpperCase()));
    }

    /**
     * Valida si el usuario tiene un permiso específico sobre un recurso
     */
    static hasPermission(user, recurso, accion) {
        // 1. Si es admin, tiene permiso automático
        if (this.isAdmin(user)) return true;

        // 2. Verificar permisos específicos
        const permissions = user.permissions || {};
        return permissions[recurso] && permissions[recurso].includes(accion);
    }
}

module.exports = Authorization;