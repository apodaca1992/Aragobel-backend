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

        // 2. REVISIÓN DIRECTA DEL MÓDULO PADRE
        // Si el recurso consultado es el módulo en sí (ej: recurso="CHECADOR")
        if (user.permisos[recursoUpper]) {
            const accionesModulo = user.permisos[recursoUpper].acciones_modulo || [];
            if (accionesModulo.includes(accionUpper)) {
                return true;
            }
        }

        // 3. 🧠 REVISIÓN DINÁMICA POR HERENCIA (Ecosistema de Recursos Internos)
        // Extraemos las llaves de los módulos que trae el usuario en su JWT (ej: ["CHECADOR", "ENTREGAS"])
        const modulosDelUsuario = Object.keys(user.permisos);

        for (const nombreModulo of modulosDelUsuario) {
            const configModulo = user.permisos[nombreModulo];
            
            // Verificamos si este módulo tiene asignados recursos internos
            const recursosInternos = configModulo.recursos_internos || [];

            // Si el recurso que pide la API (ej: "TIENDAS") está mapeado dentro de este módulo...
            if (recursosInternos.map(r => r.toUpperCase()).includes(recursoUpper)) {
                
                // ...entonces hereda las acciones permitidas para este módulo
                const accionesAutorizadas = configModulo.acciones_modulo || [];
                if (accionesAutorizadas.includes(accionUpper)) {
                    return true; // ¡Pase autorizado dinámicamente!
                }
            }
        }

        // 4. Si no cumple ningún criterio, el acceso se bloquea de manera segura
        return false;
    }
}

module.exports = Authorization;