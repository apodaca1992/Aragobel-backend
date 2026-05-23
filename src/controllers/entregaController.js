const entregaService = require('../services/entregaService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

exports.getEntregas = catchAsync(async (req, res, next) => {
    // 1. Extraemos los parámetros que vienen de Postman (?limit=5&zona=Norte)
    const { 
        limit, 
        lastDocId, 
        orderBy, 
        orderDir,
        ignorarLimite,
        ...filtros // Todo lo demás que no sea paginación se va a filtros
    } = req.query;

    // Convertimos el string "true" a un booleano real de JavaScript
    const activarIgnorarLimite = ignorarLimite === 'true';
    
    // 2. Pasamos un objeto de opciones al servicio
    const entregas = await entregaService.getAll({
        limit, 
        lastDocId, 
        orderBy, 
        orderDir,
        ignorarLimite: activarIgnorarLimite,
        filtros: { ...filtros, id_empresa: req.user.id_empresa }
    });
    return res.status(200).json({
        length: entregas.length,
        data: entregas
    });
});

exports.getEntregaById = catchAsync(async (req, res, next) => {
    const entrega = await entregaService.getById(req.params.id, req.user);

    if (!entrega) {
        logger.warn(`Entrega no encontrada`, { id, user: req.user?.id });
        return next(new AppError('No se pudo encontrar', 404));
    }

    return res.status(200).json({
        data: entrega
    });
});

exports.createEntrega = catchAsync(async (req, res, next) => {
    const nuevaEntrega = await entregaService.create({
        ...req.body,
        id_empresa: req.user.id_empresa // Viene del token decodificado
    });
    return res.status(201).json(nuevaEntrega);    
});

exports.updateEntrega = catchAsync(async (req, res, next) => {
    const actualizado = await entregaService.update(req.params.id, {
        ...req.body,
        id_empresa: req.user.id_empresa // Viene del token decodificado
    }, req.user);

    if (!actualizado) {
        logger.warn(`Intento de actualización de la Entrega fallido:`, { 
            id: req.params.id, 
            user: req.user?.id 
        });
        return next(new AppError('No se pudo actualizar', 404));
    }

    return res.status(200).json({
        data: actualizado
    });
});

exports.deleteEntrega = catchAsync(async (req, res, next) => {
    const eliminado = await entregaService.remove(req.params.id, req.user);

    if (!eliminado) {
        logger.error(`Error crítico: Fallo al eliminar la Entrega`, { 
            id: req.params.id, 
            user: req.user?.id 
        });
        return next(new AppError('No se pudo eliminar', 404));
    }

    return res.status(200).json({
        data: eliminado
    });
});

exports.generarReporte = catchAsync(async (req, res, next) => {
    const { fecha_inicio, fecha_fin, id_tienda, id_usuario, estatus, id_colonia } = req.query;

    const filtrosRaw = {
        id_tienda: id_tienda,
        fecha_venta_gte: fecha_inicio,
        fecha_venta_lte: fecha_fin,
        id_usuario: id_usuario,
        id_empresa: req.user.id_empresa,
        id_colonia: id_colonia, // <--- Nuevo filtro exacto por ID de catálogo
        estatus: estatus ? parseInt(estatus, 10) : undefined,
        activo: 1,
    };

    const filtros = Object.fromEntries(
        Object.entries(filtrosRaw).filter(([_, v]) => v != null && v !== "")
    );

    const entregas = await entregaService.getReporteEntregas({
        filtros,
        orderBy: 'fecha_venta',
        orderDir: 'asc',
        ignorarLimite: true
    });

    res.status(200).json({
        periodo: `${fecha_inicio} al ${fecha_fin}`,
        entregas
    });
});

exports.descargarReportePdf = catchAsync(async (req, res, next) => {
    const { fecha_inicio, fecha_fin, id_tienda, id_usuario, estatus, id_colonia } = req.query;

    const filtrosRaw = {
        id_tienda,
        fecha_venta_gte: fecha_inicio,
        fecha_venta_lte: fecha_fin,
        id_usuario,
        id_empresa: req.user.id_empresa,
        id_colonia, // <--- Nuevo filtro exacto para el PDF
        estatus: estatus ? parseInt(estatus, 10) : undefined,
        activo: 1,
    };

    const filtros = Object.fromEntries(
        Object.entries(filtrosRaw).filter(([_, v]) => v != null && v !== "")
    );

    const entregas = await entregaService.getReporteEntregas({
        filtros,
        orderBy: 'fecha_venta',
        orderDir: 'asc',
        ignorarLimite: true
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Reporte_Entregas.pdf`);

    const periodo = { inicio: fecha_inicio || 'Inicio', fin: fecha_fin || 'Fin' };
    
    const pdfBuffer = await entregaService.generarPdfEntregas(
        entregas, 
        periodo, 
        filtros.id_tienda, 
        req.user.id_empresa
    );
    
    res.send(pdfBuffer);
});
