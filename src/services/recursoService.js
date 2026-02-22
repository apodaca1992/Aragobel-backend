const Recurso = require('../models/Recurso');
const Aplicacion = require('../models/Aplicacion');

const getAll = async () => await Recurso.findAll({
        where: { activo: true } // Filtro explícito (Compatible con Firestore)
});

const getById = async (id) => await Recurso.findByPk(id);

const create = async (data) => {
    // 1. Obtener el dato para el snap
    const app = await Aplicacion.findByPk(data.id_aplicacion);
    
    if (!app) throw new Error("La aplicación seleccionada no existe.");

    // 2. Guardar con el "Enriquecimiento" de datos
    return await Recurso.create({
        nombre: data.nombre,
        id_aplicacion: data.id_aplicacion,
        aplicacion_nombre_snap: app.nombre, // <--- Obligatorio por el 'allowNull: false'
        activo: true
    });
}

const update = async (id, data) => {
    const recurso = await Recurso.findByPk(id);
    if (!recurso) return null;

    // Si en los datos viene un nuevo id_aplicacion, debemos actualizar el SNAP
    if (data.id_aplicacion && data.id_aplicacion !== recurso.id_aplicacion) {
        const app = await Aplicacion.findByPk(data.id_aplicacion);
        if (!app) throw new Error("La nueva aplicación no existe");

        // Inyectamos el nuevo nombre en los datos que se van a guardar
        data.aplicacion_nombre_snap = app.nombre;
    }

    // Si solo cambian el nombre del recurso u otra cosa, el update funciona normal
    return await recurso.update(data);
};

const remove = async (id) => {
    const recurso = await Recurso.findByPk(id);
    if (!recurso) return null;
    await recurso.update(
        { activo: false }
    );
    return true;
};

module.exports = { getAll, getById, create, update, remove };