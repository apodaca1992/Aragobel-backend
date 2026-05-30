const { SUPER_ROLES,RECURSOS, ACCIONES, MAPEO_MODULOS } = require('../config/constants');

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
        if (!user || !user.permisos) return false;
        console.log(recurso)

        // Normalizamos a mayúsculas para evitar discrepancias de strings ("tiendas" vs "TIENDAS")
        const recursoUpper = recurso.toUpperCase();
        const accionUpper = accion.toUpperCase();

        // 3. REVISIÓN ESTRICTA: Si el usuario tiene el recurso exacto en su JSON (ej: permisos.TIENDAS)
        if (user.permisos[recursoUpper] && user.permisos[recursoUpper].includes(accionUpper)) {
            return true;
        }

        // 4. 🧠 REVISIÓN POR MÓDULO LOGÍSTICO (Bypass Inteligente para lectura interna)
        // Extraemos los módulos reales que tiene el usuario en su JSON (ej: ["CHECADOR", "ENTREGAS"])
        const modulosDelUsuario = Object.keys(user.permisos);

        for (const modulo of modulosDelUsuario) {
            const configModulo = MAPEO_MODULOS[modulo.toUpperCase()];
            
            // Si el módulo existe en el diccionario y contiene la colección que se está pidiendo
            if (configModulo && configModulo.colecciones.includes(recursoUpper)) {
                // Y la acción solicitada es de lectura pura (VER o LISTAR)
                if (configModulo.acciones.includes(accionUpper)) {
                    return true; // ¡Pase autorizado por pertenecer al módulo lógico!
                }
            }
        }

        // 5. Si no cumple ninguna de las condiciones anteriores, se deniega de forma segura
        return false;
    }
}

module.exports = Authorization;