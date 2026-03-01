const { SUPER_ROLES,RECURSOS, ACCIONES } = require('../config/constants');

class Authorization {
    /**
     * Mapea métodos HTTP a acciones de negocio
     */
    static getActionByMethod(method, hasId = false) {
        const mapping = {
            'GET': hasId ? ACCIONES.VER : ACCIONES.LISTAR,
            'POST': ACCIONES.CREAR,
            'PUT': ACCIONES.EDITAR,
            'DELETE': ACCIONES.ELIMINAR
        };
        return mapping[method.toUpperCase()] || null;
    }

    /**
     * Valida si el usuario es administrador
     */
    static isAdmin(user) {
        if (!user || !user.roles) return false;
        return user.roles.some(rol => SUPER_ROLES.includes(rol.toUpperCase()));
    }

    /**
     * Valida si el usuario tiene un permiso específico sobre un recurso
     */
    static hasPermission(user, recurso, accion) {
        if (this.isAdmin(user)) return true;
        if (!user || !user.permissions) return false;

        if (!RECURSOS[recurso]) {
            return false;
        }

        const userPermissions = user.permissions[recurso] || [];
        return userPermissions.includes(accion);
    }
}

module.exports = Authorization;