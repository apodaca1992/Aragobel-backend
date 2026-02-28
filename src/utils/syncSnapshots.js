const AppError = require('./appError');
/**
 * Sincroniza campos denormalizados (snaps) entre un Padre y un Hijo.
 */
const syncSnapshots = (ModelPadre, ModelHijo, foreignKey, camposMap) => {
    
    // Función interna para buscar datos del padre y ponérselos al hijo
    const hidratarSnaps = async (instanciaHija, options) => {
        if (instanciaHija[foreignKey]) {
            const padre = await ModelPadre.findByPk(instanciaHija[foreignKey], {
                transaction: options.transaction,
                attributes: Object.keys(camposMap)
            });

            if (!padre) {
                // Lanzamos un error operacional de tipo 400
                throw new AppError(`Integridad: El recurso padre ${ModelPadre.name} no existe.`, 400);
            }

            Object.entries(camposMap).forEach(([campoPadre, campoSnap]) => {
                instanciaHija[campoSnap] = padre[campoPadre];
            });
        }
    };

    // CAMBIO AQUÍ: Usar beforeValidate en lugar de beforeCreate/Update
    ModelHijo.beforeValidate(async (ins, opts) => {
        // Si es nuevo o si cambió la FK, hidratamos
        if (ins.isNewRecord || ins.changed(foreignKey)) {
            await hidratarSnaps(ins, opts);
        }
    });

    // HOOK EN EL PADRE (Aplicacion)
    // Si cambia el nombre de la App, actualiza todos los Recursos vinculados
    ModelPadre.afterUpdate(async (instanciaPadre, options) => {
        const updates = {};
        Object.entries(camposMap).forEach(([campoPadre, campoSnap]) => {
            if (instanciaPadre.changed(campoPadre)) {
                updates[campoSnap] = instanciaPadre.getDataValue(campoPadre);
            }
        });

        if (Object.keys(updates).length > 0) {
            await ModelHijo.update(updates, {
                where: { [foreignKey]: instanciaPadre[ModelPadre.primaryKeyAttribute] },
                transaction: options.transaction
            });
        }
    });

    // Usamos beforeUpdate porque estamos haciendo borrado lógico (activo: false)
    ModelPadre.beforeUpdate(async (instanciaPadre, options) => {
        
        // Verificamos si el usuario está intentando desactivar el registro
        if (instanciaPadre.changed('activo') && instanciaPadre.activo === false) {
            
            const conteoHijos = await ModelHijo.count({
                where: { 
                    [foreignKey]: instanciaPadre[ModelPadre.primaryKeyAttribute],
                    activo: true // Solo nos importan los hijos que aún están activos
                },
                transaction: options.transaction
            });

            if (conteoHijos > 0) {
                throw new AppError(
                    `No se puede eliminar ${ModelPadre.name} porque tiene ${conteoHijos} ${ModelHijo.name}(s) asociados y activos.`, 
                    400
                );
            }
        }
    });
};

module.exports = { syncSnapshots };