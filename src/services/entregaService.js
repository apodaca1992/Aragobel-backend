const Firestore = require('../utils/firestoreUtils'); // Importamos el objeto completo
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

const getAll = async (opciones = {}) => {

    // 1. Extraemos los filtros de las opciones
    let { filtros = {} } = opciones;

    // 2. Lógica de Negocio: Si fecha_venta es 'TODAY' o no viene, inyectamos la fecha del servidor
    // Esto garantiza que el cliente no tenga que calcularla
    if (!filtros.fecha_venta || filtros.fecha_venta === 'TODAY') {
        filtros.fecha_venta = new Date().toLocaleString("sv-SE", { 
            timeZone: "America/Mazatlan" 
        }).split(' ')[0]; 
    }

    return await Firestore.findAll('entregas',{ ...opciones, filtros })
};
   
const getById = async (id, user) => {

    const entregaExistente = await Firestore.findByPk('entregas',id);

    if (!entregaExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`La entrega '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    // Validación de pertenencia
    if (entregaExistente.id_empresa !== user.id_empresa) {
        logger.warn(`Intento para acceso NO AUTORIZADO: Usuario ${user.id} intentó obtener la entrega ${id}`);
        throw new AppError('No tienes permiso para acceder a esta entrega', 403);
    }

    return entregaExistente;
}

const create = async (data) => {
    // 2. Lógica de Negocio: Si fecha_venta es 'TODAY' o no viene, inyectamos la fecha del servidor
    // Esto garantiza que el cliente no tenga que calcularla
    if (!data.fecha_venta || data.fecha_venta === 'TODAY') {
        data.fecha_venta = new Date().toLocaleString("sv-SE", { 
            timeZone: "America/Mazatlan" 
        }).split(' ')[0]; 
    }
    return await Firestore.create('entregas',data);
}

const update = async (id, data, user) => {
    const entregaExistente = await Firestore.findByPk('entregas',id);
    if (!entregaExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`La entrega '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    // 2. Validar que la entrega le pertenezca a la empresa del usuario
    if (entregaExistente.id_empresa !== user.id_empresa) {
        logger.warn(`Intento de edición NO AUTORIZADO: Usuario ${user.id} intentó editar entrega ${id}`);
        throw new AppError('No tienes permiso para editar esta entrega', 403);
    }

    // --- LÓGICA AUTOMÁTICA PARA FECHA DE SALIDA ---
    // Si el cliente envía estatus 2 (En camino) y la entrega no tenía fecha de salida previa
    if (data.estatus === 2 && !entregaExistente.fec_salidapedido) {
        data.fec_salidapedido = new Date(); // Estampa de tiempo oficial del servidor
    }

    // 2. ENTREGA (Estatus 3: Entregado)
    if (data.estatus === 3 && !entregaExistente.fec_entregapedido) {
        data.fec_entregapedido = new Date();
    }

    const resultadoUpdate = await Firestore.update('entregas',id,data);

    return {
        ...entregaExistente, // Trae id, activo, createdAt, etc.
        ...resultadoUpdate  // Sobrescribe los campos cambiados y trae el nuevo updatedAt
    };
};

const remove = async (id, user) => {
    const entregaExistente = await Firestore.findByPk('entregas',id);
    if (!entregaExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`La entrega '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    // Validación de pertenencia
    if (entregaExistente.id_empresa !== user.id_empresa) {
        logger.warn(`Intento para eliminación NO AUTORIZADO: Usuario ${user.id} intentó borrar la entrega ${id}`);
        throw new AppError('No tienes permiso para borrar a esta entrega', 403);
    }

    const resultadoSoftDelete= await Firestore.softDelete('entregas',id);

    return {
        ...entregaExistente, // Trae id, activo, createdAt, etc.
        ...resultadoSoftDelete  // Sobrescribe los campos cambiados y trae el nuevo updatedAt
    };
};

module.exports = { getAll, getById, create, update, remove };