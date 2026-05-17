const Firestore = require('../utils/firestoreUtils'); // Importamos el objeto completo
const { db, admin } = require('../../config/firebase');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const pdfGenerator = require('../utils/pdfGenerator');

const getAll = async (opciones = {}) => {

    // 1. Extraemos los filtros de las opciones
    let { filtros = {} } = opciones;

    // 2. Lógica de Negocio: Si viene una fecha y es 'TODAY', inyectamos la fecha del servidor    
    // Esto garantiza que el cliente no tenga que calcularla
    if (typeof filtros.fecha_venta === 'string' && filtros.fecha_venta.startsWith('TODAY')) {
        let timeZone = "America/Mazatlan"; // Default por seguridad

        // 2. Intentamos extraer el ID de la tienda después del '|'
        const partes = filtros.fecha_venta.split('|'); // ['TODAY', 'wEKDul8fyZuLeOKBbVSu']
        const idTiendaDesdeFiltro = partes[1];

        if (idTiendaDesdeFiltro) {
            const tienda = await Firestore.findByPk('tiendas', idTiendaDesdeFiltro);
            if (tienda && tienda.configuracion_asistencia?.time_zone) {
                timeZone = tienda.configuracion_asistencia.time_zone;
            }
        }

        filtros.fecha_venta = new Date().toLocaleString("sv-SE", { 
            timeZone: timeZone 
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
    if (typeof data.fecha_venta === 'string' && data.fecha_venta.startsWith('TODAY')) {
        // --- 2. VALIDACIÓN DE GEOCERCA (NUEVA) ---
        if (!data.id_tienda) throw new AppError('No se especificó la tienda', 400);

        const tienda = await Firestore.findByPk('tiendas', data.id_tienda);
        if (!tienda) throw new AppError('La tienda no existe', 404);

        data.fecha_venta = new Date().toLocaleString("sv-SE", { 
            timeZone: tienda.configuracion_asistencia.time_zone 
        }).split(' ')[0]; 
    }

    // --- VALIDACIÓN DE DUPLICADOS ---
    // Buscamos si ya existe una asistencia para este usuario, este día y este tipo
    const registrosExistentes = await Firestore.findAll('entregas', {
        filtros: {
            id_tienda: data.id_tienda,
            fecha_venta: data.fecha_venta,
            folio: data.folio,
            activo: 1 // IMPORTANTE: Para que tu findAll no use el default
        },
        limit: 1
    });
    console.log(registrosExistentes)
    if (registrosExistentes.length > 0) {
        throw new AppError(`Ya existe un registro de con folio ${data.folio} para hoy`, 400);
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

const getReporteEntregas = async (opciones = {}) => {
    const entregas = await Firestore.findAll('entregas', opciones);
    const reporteMap = {};

    for (const entrega of entregas) {
        const repartidorNombre = entrega.nombre_repartidor || 'Sin Asignar';
        
        if (!reporteMap[repartidorNombre]) {
            reporteMap[repartidorNombre] = {
                repartidor: repartidorNombre,
                total_entregas: 0,
                lista_entregas: []
            };
        }

        const fCreacion = entrega.createdAt?.toDate ? entrega.createdAt.toDate() : (entrega.createdAt ? new Date(entrega.createdAt) : null);
        const fSalida = entrega.fec_salidapedido?.toDate ? entrega.fec_salidapedido.toDate() : (entrega.fec_salidapedido ? new Date(entrega.fec_salidapedido) : null);
        const fEntrega = entrega.fec_entregapedido?.toDate ? entrega.fec_entregapedido.toDate() : (entrega.fec_entregapedido ? new Date(entrega.fec_entregapedido) : null);

        let tEsperaAsignacion = "N/A";
        let tDuracionViaje = "N/A";
        let tTotalProceso = "N/A";

        if (fCreacion && fSalida) {
            tEsperaAsignacion = `${((fSalida - fCreacion) / (1000 * 60)).toFixed(0)} min`;
        }
        if (fSalida && fEntrega) {
            tDuracionViaje = `${((fEntrega - fSalida) / (1000 * 60)).toFixed(0)} min`;
        }
        if (fCreacion && fEntrega) {
            const totalMinutos = (fEntrega - fCreacion) / (1000 * 60);
            tTotalProceso = totalMinutos > 60 
                ? `${(totalMinutos / 60).toFixed(2)} hrs` 
                : `${totalMinutos.toFixed(0)} min`;
        }

        const formatearHora = (date) => date ? date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';
        const formatearFecha = (date) => date ? date.toLocaleDateString('sv-SE') : 'N/A';

        reporteMap[repartidorNombre].total_entregas += 1;

        // Si no está asignado, cambiamos el vehículo de 'N/A' a algo más descriptivo si prefieres, 
        // o lo dejamos limpio.
        const vehiculoText = repartidorNombre === 'Sin Asignar' ? 'Pendiente' : (entrega.nombre_vehiculo || 'N/A');

        // Mejoramos la lógica del cliente y cajero para evitar nombres genéricos o repetidos si el estatus es 1
        const personaRecibe = entrega.persona_recibe ? entrega.persona_recibe : 'Pendiente de entrega';
        const cajeroNombre = entrega.nombre_usuario_creador || 'Sistema'; // O la variable donde guardes el nombre real del cajero

        // Agrega este mapeador visual antes de retornar el objeto de la entrega
        let textoEstatus = 'Registrado';
        if (entrega.estatus === 2) textoEstatus = 'En Camino';
        if (entrega.estatus === 3) textoEstatus = 'Entregado';
        reporteMap[repartidorNombre].lista_entregas.push({
            id_entrega: entrega.id,
            folio: entrega.folio || 'N/A', // <--- Extraemos el folio real de Firestore (ej. "2")
            fecha: formatearFecha(fCreacion),
            h_creacion: formatearHora(fCreacion),
            cajero: cajeroNombre,
            cliente: personaRecibe,
            colonia: entrega.colonia || 'N/A',
            vehiculo: vehiculoText,
            h_salida: formatearHora(fSalida),
            h_entrega: formatearHora(fEntrega),
            espera: tEsperaAsignacion,
            viaje: tDuracionViaje,
            total: tTotalProceso,
            estatusText: textoEstatus
        });
    }

    return Object.values(reporteMap);
};

/**
 * Genera el PDF con el Folio integrado en la columna de la Fecha
 */
const generarPdfEntregas = async (repartidores, periodo, id_tienda, id_empresa) => {
    const db = admin.firestore();
    let nombreEmpresa = 'ARAGOBEL';
    let nombreTienda = 'Sucursal';

    try {
        const [empresaDoc, tiendaDoc] = await Promise.all([
            id_empresa ? db.collection('empresas').doc(id_empresa).get() : null,
            id_tienda ? db.collection('tiendas').doc(id_tienda).get() : null
        ]);
        if (empresaDoc?.exists) nombreEmpresa = empresaDoc.data().nombre || nombreEmpresa;
        if (tiendaDoc?.exists) nombreTienda = tiendaDoc.data().nombre || nombreTienda;
    } catch (error) {
        console.error('Error al traer contexto para PDF de entregas:', error);
    }

    const contenidoPdf = [
        { text: `REPORTE LOGÍSTICO DE ENTREGAS`, style: 'headerTitle' },
        { text: `Empresa: ${nombreEmpresa}  |  Tienda: ${nombreTienda}`, style: 'headerSubtitleStore' },
        { text: `Periodo: ${periodo.inicio} al ${periodo.fin}`, style: 'headerSubtitleDates' }
    ];

    repartidores.forEach(rep => {
        contenidoPdf.push({ text: `Repartidor: ${rep.repartidor}`, style: 'repName' });
        contenidoPdf.push({ 
            text: `Total Entregas: ${rep.total_entregas}`, 
            style: 'repMeta' 
        });

        const tablaEntregas = {
            table: {
                headerRows: 1,
                // Mantenemos los mismos 9 anchos proporcionales optimizados
                widths: ['11%', '*', '13%', '*', '10%', '10%', '10%', '10%', '10%'],
                body: [
                    [
                        { text: 'Fecha / Folio', style: 'tableHeader' }, // Cabecera actualizada
                        { text: 'Destino / Recibió', style: 'tableHeader' },
                        { text: 'Vehículo', style: 'tableHeader' }, 
                        { text: 'Creado / Cajero', style: 'tableHeader' },
                        { text: 'Salió', style: 'tableHeader' },
                        { text: 'Entregado', style: 'tableHeader' },
                        { text: 'T. Espera', style: 'tableHeader' },
                        { text: 'T. Ruta', style: 'tableHeader' },
                        { text: 'T. Total', style: 'tableHeader' }
                    ]
                ]
            },
            layout: {
                hLineWidth: function (i, node) { return (i === 0 || i === node.table.body.length) ? 1 : 0.5; },
                vLineWidth: function (i, node) { return 0; },
                hLineColor: function (i, node) { return (i === 0 || i === node.table.body.length) ? '#444444' : '#dddddd'; },
                paddingLeft: function (i, node) { return 6; },
                paddingRight: function (i, node) { return 6; },
                paddingTop: function (i, node) { return 5; },
                paddingBottom: function (i, node) { return 5; }
            }
        };

        rep.lista_entregas.forEach(ent => {
            tablaEntregas.table.body.push([
                // Combinamos la Fecha con el Folio de forma elegante usando el array de texto de pdfmake
                { 
                    text: [
                        { text: `${ent.fecha}\n` },
                        { text: `Folio: ${ent.folio}`, bold: true, color: '#ff5722', fontSize: 7.5 } // Folio destacado
                    ], 
                    style: 'tableBody' 
                },
                { 
                    text: [
                        { text: `Col. ${ent.colonia}\n`, bold: true, color: '#111111' },
                        { text: ent.estatusText === 'Registrado' ? '(Por recibir)' : `(${ent.cliente})`, fontSize: 7.5, color: '#555555' }
                    ], 
                    style: 'tableBodyLeft' 
                }, 
                { text: ent.vehiculo, style: 'tableBody' }, 
                { 
                    text: [
                        { text: `${ent.h_creacion}\n` },
                        { text: `Cap: ${ent.cajero}`, fontSize: 7, color: '#666666' } // Muestra quién lo capturó
                    ], 
                    style: 'tableBodyLeft' 
                },
                { text: ent.h_salida, style: 'tableBody' },
                { text: ent.h_entrega, style: 'tableBody' },
                { text: ent.espera, style: 'tableBody' },
                { text: ent.viaje, style: 'tableBody' },
                { 
                    text: [
                        { text: `${ent.total}\n` },
                        { text: ent.estatusText, fontSize: 7, color: ent.estatusText === 'Entregado' ? '#2e7d32' : (ent.estatusText === 'Registrado' ? '#b71c1c' : '#0288d1'), bold: true }
                    ],
                    style: 'tableBody' 
                }
            ]);
        });

        contenidoPdf.push(tablaEntregas);
    });

    const estilosEntrega = {
        headerTitle: { fontSize: 16, bold: true, alignment: 'center', margin: [0, 0, 0, 5] },
        headerSubtitleStore: { fontSize: 11, alignment: 'center', color: '#333', margin: [0, 0, 0, 2] },
        headerSubtitleDates: { fontSize: 9, alignment: 'center', color: '#666', margin: [0, 0, 0, 15] },
        repName: { fontSize: 12, bold: true, margin: [0, 15, 0, 3] },
        repMeta: { fontSize: 9, color: '#666', margin: [0, 0, 0, 10] },
        tableHeader: { fontSize: 8, bold: true, fillColor: '#f2f2f2', alignment: 'center', margin: [0, 2, 0, 2] },
        tableBody: { fontSize: 8, alignment: 'center' },
        tableBodyLeft: { fontSize: 8, alignment: 'left' }
    };

    return await pdfGenerator.createReporteBuffer(contenidoPdf, estilosEntrega, { pageOrientation: 'landscape' });
};

module.exports = { getAll, getById, create, update, remove, getReporteEntregas, generarPdfEntregas };