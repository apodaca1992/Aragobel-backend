//const { Entrega, Tienda, Usuario } = require('../models');

/**
 * Lógica para obtener entregas filtradas por rol
 */
const listarEntregasService = async (idUsuario, roles) => {
    // 1. Configuramos la base de la consulta
    let opcionesBusqueda = {
        include: [
            //{ model: Tienda, attributes: ['nombre', 'direccion'] },
            //{ model: Usuario, attributes: ['usuario'] }
        ],
        order: [['createdAt', 'DESC']]
    };

    // 2. Aplicamos lógica de negocio (Filtro por Rol)
    const esAdmin = roles.includes('ADMINISTRADOR');

    if (!esAdmin) {
        opcionesBusqueda.where = { id_usuario: idUsuario };
    }

    // 3. Ejecutamos la consulta
    const entregas = [];
    //const entregas = await Entrega.findAll(opcionesBusqueda);
    
    /*return {
        entregas,
        esAdmin
    };*/
    return {
        entregas,
        esAdmin
    };
};


module.exports = {
    listarEntregasService
};