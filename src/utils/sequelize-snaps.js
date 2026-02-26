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
                throw new Error(`Integridad: No existe ${ModelPadre.name} con ID ${instanciaHija[foreignKey]}`);
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
};

module.exports = { syncSnapshots };