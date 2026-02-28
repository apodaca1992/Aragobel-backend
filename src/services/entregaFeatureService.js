//const { Entrega, Tienda, Usuario } = require('../models');
const Authorization = require('../utils/Authorization');

/**
 * Lógica para obtener entregas filtradas por rol
 */
const listarEntregasService = async (user) => {
    // 1. Configuramos la base de la consulta
    let opcionesBusqueda = {
        include: [
            //{ model: Tienda, attributes: ['nombre', 'direccion'] },
            //{ model: Usuario, attributes: ['usuario'] }
        ],
        order: [['createdAt', 'DESC']]
    };

    // 2. Aplicamos lógica de negocio (Filtro por Rol)
    if (!Authorization.isAdmin(user)) {
        opcionesBusqueda.where = { id_usuario: user.idUsuario };
    }

    // 3. Ejecutamos la consulta
    const entregas = [];
    //const entregas = await Entrega.findAll(opcionesBusqueda);
    
    /*return {
        entregas,
        esAdmin
    };*/
    return {
        entregas
    };
};


module.exports = {
    listarEntregasService
};