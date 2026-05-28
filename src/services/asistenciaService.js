const Firestore = require('../utils/firestoreUtils'); // Importamos el objeto completo
const { db, admin } = require('../../config/firebase');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const geoUtils = require('../utils/geoUtils');
const pdfGenerator = require('../utils/pdfGenerator');

const getAll = async (opciones = {}) => {
    // 1. Extraemos los filtros de las opciones
    let { filtros = {} } = opciones;

    // 2. Lógica de Negocio: Si viene una fecha y es 'TODAY', inyectamos la fecha del servidor    
    // Esto garantiza que el cliente no tenga que calcularla
    if (typeof filtros.fecha === 'string' && filtros.fecha.startsWith('TODAY')) {
        let timeZone = "America/Mazatlan"; // Default por seguridad

        // 2. Intentamos extraer el ID de la tienda después del '|'
        const partes = filtros.fecha.split('|'); // ['TODAY', 'wEKDul8fyZuLeOKBbVSu']
        const idTiendaDesdeFiltro = partes[1];

        if (idTiendaDesdeFiltro) {
            const tienda = await Firestore.findByPk('tiendas', idTiendaDesdeFiltro);
            if (tienda && tienda.configuracion_asistencia?.time_zone) {
                timeZone = tienda.configuracion_asistencia.time_zone;
            }
        }

        filtros.fecha = new Date().toLocaleString("sv-SE", { 
            timeZone: timeZone 
        }).split(' ')[0]; 
    }

    return await Firestore.findAll('asistencias',opciones);
}
   
const getById = async (id, user) => {

    const asistenciaExistente = await Firestore.findByPk('asistencias',id);

    if (!asistenciaExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`La asistencia '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    // Validación de pertenencia
    if (asistenciaExistente.id_empresa !== user.id_empresa) {
        logger.warn(`Intento para acceso NO AUTORIZADO: Usuario ${user.id} intentó obtener la asistencia ${id}`);
        throw new AppError('No tienes permiso para acceder a esta asistencia', 403);
    }

    return asistenciaExistente;
}

const create = async (data) => {
    if (!data.tipo) throw new AppError('El tipo de checada es obligatorio', 400);
    const tipoUpper = data.tipo.toUpperCase();

    // --- 2. VALIDACIÓN DE GEOCERCA (NUEVA) ---
    if (!data.id_tienda) throw new AppError('No se especificó la tienda', 400);

    const tienda = await Firestore.findByPk('tiendas', data.id_tienda);
    if (!tienda) throw new AppError('La tienda no existe', 404);

    // 1. Obtener tiempo oficial de Mazatlán
    const timeZone = tienda.configuracion_asistencia?.time_zone || "America/Mazatlan";
    const localTime = new Date().toLocaleString("sv-SE", { timeZone });
    const [fecha, hora] = localTime.split(' ');

    // 2. Definir ID ÚNICO por día y usuario
    const docId = `${data.id_usuario}_${fecha}_${data.id_tienda}`;
    const docRef = db.collection('asistencias').doc(docId);

    // --- VALIDACIÓN DE DUPLICADOS ---
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        const jornada = docSnap.data();
        if (jornada.eventos && jornada.eventos[tipoUpper]) {
            throw new AppError(`Ya existe un registro de ${tipoUpper} para hoy`, 400);
        }
    }

    // Extraemos coordenadas de la tienda (asumiendo que en Firestore son GeoPoint o tienen lat/lng)
    const tiendaLat = tienda.ubicacion._latitude || tienda.ubicacion.lat;
    const tiendaLng = tienda.ubicacion._longitude || tienda.ubicacion.lng;

    // Coordenadas que envía el usuario desde el móvil
    const userLat = parseFloat(data.ubicacion.lat);
    const userLng = parseFloat(data.ubicacion.lng);

    const distancia = geoUtils.calcularDistanciaMetros(userLat, userLng, tiendaLat, tiendaLng);
    const RADIO_MAXIMO = tienda.configuracion_asistencia?.radio_maximo_metros || 200;

    if (distancia > RADIO_MAXIMO) {
        logger.warn(`Intento de checada fuera de rango: Usuario a ${Math.round(distancia)} metros`);
        throw new AppError(`Estás demasiado lejos de la tienda (${Math.round(distancia)}m).`, 403);
    }

    // --- 🚨 CANDADOS DE FLUJO DE NEGOCIO (SÓLO SI EL DOCUMENTO YA EXISTE) 🚨 ---
    if (docSnap.exists) {
        const jornadaExistente = docSnap.data();
        const tipoEsquemaActual = jornadaExistente.tipo_esquema || "LIBRE";
        const eventosActuales = jornadaExistente.eventos || {};

        if (tipoEsquemaActual === 'FIJO') {
            const tieneHorarioComida = !!(jornadaExistente.hora_salida_comer && jornadaExistente.hora_salida_comer !== "");

            // REGLA 1: Bloquear Salida Final si tiene un horario de comida asignado pero no cerró su ciclo
            if (tipoUpper === 'SALIDA' && tieneHorarioComida) {
                const checkComidaInicio = eventosActuales.COMIDA_INICIO?.hora;
                const checkComidaFin = eventosActuales.COMIDA_FIN?.hora;

                if (!checkComidaInicio || !checkComidaFin) {
                    logger.warn(`Intento de salida final bloqueado: Usuario ${data.id_usuario} no completó su ciclo de comida.`);
                    throw new AppError('No puedes registrar tu salida final porque no has completado tus registros de comida (Inicio/Fin).', 400);
                }
            }

            // REGLA 2: Bloquear botones de comida si es horario corrido (campos vacíos en la asistencia de hoy)
            if ((tipoUpper === 'COMIDA_INICIO' || tipoUpper === 'COMIDA_FIN') && !tieneHorarioComida) {
                logger.warn(`Intento de checada de comida bloqueado: Usuario ${data.id_usuario} tiene horario corrido sin descanso.`);
                throw new AppError('Tu perfil está configurado con horario corrido. No tienes permitido registrar salidas a comer.', 400);
            }

            // 🔥 REGLA 3 (NUEVA): Bloquear salida a comer si es antes de la hora estipulada
            if (tipoUpper === 'COMIDA_INICIO' && tieneHorarioComida) {
                const hRealDecimal = parseHoraADecimal(hora);
                const hSalidaComerPactadaDecimal = parseHoraADecimal(jornadaExistente.hora_salida_comer);

                if (hRealDecimal < hSalidaComerPactadaDecimal) {
                    logger.warn(`Intento de salida a comer anticipado: Usuario ${data.id_usuario} intentó salir a las ${hora} cuando su hora asignada es ${jornadaExistente.hora_salida_comer}`);
                    throw new AppError(`Aún no es tu hora de salida a comer. No puedes registrarla antes de tu horario asignado (${jornadaExistente.hora_salida_comer.substring(0, 5)}).`, 403);
                }
            }
        }
    }

    // 5. Preparar objeto de actualización (Dot Notation para no borrar otros eventos)
    const updateData = {
        id_usuario: data.id_usuario,
        nombre_usuario: data.nombre_usuario,
        fecha: fecha,
        id_tienda: data.id_tienda,
        id_empresa: data.id_empresa,
        activo: 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Usamos el bracket notation para que la llave sea dinámica (ENTRADA, SALIDA, etc)
    // Pero la enviamos como un objeto anidado real
    updateData['eventos'] = {
        [tipoUpper]: {
            hora: hora,
            ubicacion: new admin.firestore.GeoPoint(userLat, userLng),
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        }
    };

    // --- 3. LÓGICA ESPECÍFICA PARA ENTRADA (Snapshot de Configuración) ---
    if (tipoUpper === 'ENTRADA') {
        const usuario = await Firestore.findByPk('usuarios', data.id_usuario);
        if (!usuario) throw new AppError('Usuario no encontrado', 404);

        // Buscar la configuración de la tienda asignada al usuario
        const tiendaConfig = usuario.tiendas_asignadas?.find(t => t.id_tienda === data.id_tienda);
        
        // Inyectamos la meta del día (snapshot)
        updateData.createdAt = admin.firestore.FieldValue.serverTimestamp();
        updateData.tipo_esquema = tiendaConfig?.tipo_esquema || "LIBRE";

        if (updateData.tipo_esquema === 'LIBRE') {
            updateData.jornada_efectiva = tiendaConfig?.jornada_efectiva ?? 9.5;
            updateData.tiempo_comida_max = tiendaConfig?.tiempo_comida_max ?? 1.5;
        } 
        else if (updateData.tipo_esquema === 'FIJO') {
            const horaEntradaPactadaStr = tiendaConfig?.hora_entrada || "08:00:00";
        
            const hRealDecimal = parseHoraADecimal(hora);            // Hora real actual del servidor
            const hPactadaDecimal = parseHoraADecimal(horaEntradaPactadaStr); // Hora oficial asignada

            // -------------------------------------------------------------------------
            // 🔥 NUEVA VALIDACIÓN: BLOQUEO ANTES DE LA HORA ASIGNADA (FIJA)
            // -------------------------------------------------------------------------
            if (hRealDecimal < hPactadaDecimal) {
                logger.warn(`Bloqueo por checada anticipada: Usuario ${data.id_usuario} intentó entrar a las ${hora} cuando su entrada es a las ${horaEntradaPactadaStr}`);
                throw new AppError(
                    `Aún no es tu hora de entrada. No puedes checar asistencia antes de tu horario oficial asignado (${horaEntradaPactadaStr.substring(0, 5)}).`, 
                    403
                );
            }

            // VALIDACIÓN POSTERIOR: BLOQUEO TRAS 2 HORAS DE RETARDO
            if (hRealDecimal > (hPactadaDecimal + 2.0)) {
                logger.warn(`Bloqueo de checada por retardo excesivo: Usuario ${data.id_usuario} intentó checar entrada a las ${hora}`);
                throw new AppError(
                    `No puedes checar entrada. Ya transcurrieron más de 2 horas desde tu hora de ingreso oficial (${horaEntradaPactadaStr.substring(0, 5)}). Reporta tu asistencia con tu administrador.`, 
                    403
                );
            }
            // -------------------------------------------------------------------------

            updateData.hora_entrada = horaEntradaPactadaStr;
            updateData.hora_salida = tiendaConfig?.hora_salida || "17:30:00";
            updateData.tolerancia_minutos = tiendaConfig?.tolerancia_minutos || 0;

            // 🔥 VALIDACIÓN LIMPIA: Solo inyectamos los campos de comida si REALMENTE existen configurados
            if (tiendaConfig?.hora_salida_comer && tiendaConfig?.hora_salida_comer !== "") {
                updateData.hora_salida_comer = tiendaConfig.hora_salida_comer;
            }
            if (tiendaConfig?.hora_regreso_comer && tiendaConfig?.hora_regreso_comer !== "") {
                updateData.hora_regreso_comer = tiendaConfig.hora_regreso_comer;
            }
        }
    }

    // 6. Guardar con MERGE (Crea si no existe, actualiza si sí)
    await docRef.set(updateData, { merge: true });

    return { id: docId, ...updateData };
}

const update = async (id, data, user) => {
    const asistenciaExistente = await Firestore.findByPk('asistencias',id);
    if (!asistenciaExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`La asistencia '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    // 2. Validar que la tienda le pertenezca a la empresa del usuario
    if (asistenciaExistente.id_empresa !== user.id_empresa) {
        logger.warn(`Intento de edición NO AUTORIZADO: Usuario ${user.id} intentó editar asistencia ${id}`);
        throw new AppError('No tienes permiso para editar esta asistencia', 403);
    }

    // Si data trae "eventos", hay que tener cuidado de no sobrescribir todo el mapa
    // Una opción es normalizar a dot notation si detectas el objeto eventos
    let dataFinal = { ...data };
    if (data.eventos) {
        // Recorremos los tipos de eventos (ENTRADA, SALIDA, etc.)
        Object.keys(data.eventos).forEach(tipo => {
            const camposEvento = data.eventos[tipo]; // { hora: "...", comentario: "..." }
            
            // Recorremos cada campo dentro del evento para crear la ruta completa
            Object.keys(camposEvento).forEach(campo => {
                const rutaPunto = `eventos.${tipo}.${campo}`;
                dataFinal[rutaPunto] = camposEvento[campo];
            });
        });
        
        // Eliminamos el objeto 'eventos' original para que no sobrescriba todo
        delete dataFinal.eventos;
    }

    await Firestore.update('asistencias', id, dataFinal);
    // 3. LA CLAVE: Volvemos a consultar el documento de la DB 
    // para obtener la estructura final ya procesada por Firestore
    const asistenciaActualizada = await Firestore.findByPk('asistencias', id);
    return asistenciaActualizada;
};

const remove = async (id, user) => {
    const asistenciaExistente = await Firestore.findByPk('asistencias',id);
    if (!asistenciaExistente) {
        // Lanzamos un error de negocio claro
        const error = new AppError(`La asistencia '${id}' no existe en el sistema.`);
        error.statusCode = 400; // Bad Request
        throw error;
    }

    // Validación de pertenencia
        if (asistenciaExistente.id_empresa !== user.id_empresa) {
            logger.warn(`Intento para eliminación NO AUTORIZADO: Usuario ${user.id} intentó borrar la asistencia ${id}`);
            throw new AppError('No tienes permiso para borrar a esta asistencia', 403);
        }

    const resultadoSoftDelete= await Firestore.softDelete('asistencias',id);

    return {
        ...asistenciaExistente, // Trae id, activo, createdAt, etc.
        ...resultadoSoftDelete  // Sobrescribe los campos cambiados y trae el nuevo updatedAt
    };
};

const getReporteHoras = async (opciones = {}) => {
    const asistencias = await Firestore.findAll('asistencias', opciones);
    const reporteMap = {};
    const now = new Date();

    for (const asist of asistencias) {
        const userId = asist.id_usuario;
        const tipoEsquema = asist.tipo_esquema || "LIBRE";
        
        if (!reporteMap[userId]) {
            reporteMap[userId] = {
                id_usuario: userId,
                nombre: asist.nombre_usuario,
                foto: asist.nombre_usuario ? asist.nombre_usuario.charAt(0).toUpperCase() : "?",
                total_horas: 0,
                extras: 0,
                faltantes: 0,
                asistencias: []
            };
        }

        const eventos = asist.eventos || {};
        let horasEfectivas = 0;
        let entrada = "N/A";
        let salida = "N/A";
        let salidaComer = "N/A";
        let regresoComer = "N/A";
        
        let estatusLabel = "A tiempo";
        let colorJornada = "light";
        let diferencia = 0;
        let jornadaAsignadaCalculo = 0;

        if (eventos.ENTRADA) {
            entrada = eventos.ENTRADA.hora;
            const hEntradaReal = parseHoraADecimal(entrada);
            let hSalidaReal;

            if (eventos.SALIDA) {
                salida = eventos.SALIDA.hora;
                hSalidaReal = parseHoraADecimal(salida);
            } else {
                const horaActualLocal = now.toLocaleTimeString("sv-SE", { hour12: false });
                hSalidaReal = parseHoraADecimal(horaActualLocal);
                salida = "EN CURSO...";
            }

            if (eventos.COMIDA_INICIO) salidaComer = eventos.COMIDA_INICIO.hora;
            if (eventos.COMIDA_FIN) regresoComer = eventos.COMIDA_FIN.hora;

            // -------------------------------------------------------------
            // CAMINO A: PROCESAMIENTO ESQUEMA LIBRE
            // -------------------------------------------------------------
            if (tipoEsquema === 'LIBRE') {
                const jornadaMeta = asist.jornada_efectiva || 9.5;
                const comidaDefault = asist.tiempo_comida_max || 1.5;
                jornadaAsignadaCalculo = jornadaMeta;

                let tiempoComida = 0;
                if (eventos.COMIDA_INICIO && eventos.COMIDA_FIN) {
                    tiempoComida = parseHoraADecimal(eventos.COMIDA_FIN.hora) - parseHoraADecimal(eventos.COMIDA_INICIO.hora);
                } else if (eventos.COMIDA_INICIO && !eventos.COMIDA_FIN) {
                    tiempoComida = comidaDefault;
                    regresoComer = "EN COMIDA...";
                }

                horasEfectivas = Math.max(0, hSalidaReal - hEntradaReal - tiempoComida);
                let diferenciaOriginal = horasEfectivas - jornadaMeta;
                diferencia = Number(diferenciaOriginal.toFixed(2));

                if (horasEfectivas > 0) {
                    if (diferencia > 0) {
                        estatusLabel = `Extra (${diferencia.toFixed(2)} hrs)`;
                        colorJornada = "success";
                    } else if (diferencia < 0) {
                        estatusLabel = `Faltante (${Math.abs(diferencia).toFixed(2)} hrs)`;
                        colorJornada = "danger";
                    }
                } else {
                    estatusLabel = `Faltante (${jornadaMeta.toFixed(2)} hrs)`;
                    colorJornada = "danger";
                }
            }
            // -------------------------------------------------------------
            // CAMINO B: PROCESAMIENTO ESQUEMA FIJO
            // -------------------------------------------------------------
            else if (tipoEsquema === 'FIJO') {
                const hEntradaTeorica = parseHoraADecimal(asist.hora_entrada || "08:00:00");
                const hSalidaComerTeorica = parseHoraADecimal(asist.hora_salida_comer || "14:00:00");
                const hRegresoComerTeorica = parseHoraADecimal(asist.hora_regreso_comer || "15:00:00");
                const hSalidaTeorica = parseHoraADecimal(asist.hora_salida || "17:30:00");
                const toleranciaHoras = (asist.tolerancia_minutos || 0) / 60;

                const comidaTeorica = hRegresoComerTeorica - hSalidaComerTeorica;
                jornadaAsignadaCalculo = (hSalidaTeorica - hEntradaTeorica) - comidaTeorica;

                let acumuladoMinutosFaltantes = 0;
                let flagsFaltasOretardos = [];

                // 1. Evaluar Retardo en la Entrada
                if (hEntradaReal > (hEntradaTeorica + toleranciaHoras)) {
                    const minRetardo = Math.round((hEntradaReal - hEntradaTeorica) * 60);
                    flagsFaltasOretardos.push(`Retardo (${minRetardo} min)`);
                    acumuladoMinutosFaltantes += minRetardo;
                }

                // 2. Evaluar exceso en tiempo de comida
                if (eventos.COMIDA_INICIO && eventos.COMIDA_FIN) {
                    const comidaReal = parseHoraADecimal(eventos.COMIDA_FIN.hora) - parseHoraADecimal(eventos.COMIDA_INICIO.hora);
                    if (comidaReal > comidaTeorica) {
                        const minExcesoComida = Math.round((comidaReal - comidaTeorica) * 60);
                        flagsFaltasOretardos.push(`Exceso Comida (${minExcesoComida} min)`);
                        acumuladoMinutosFaltantes += minExcesoComida;
                    }
                } else if (eventos.COMIDA_INICIO && !eventos.COMIDA_FIN) {
                    regresoComer = "EN COMIDA...";
                }

                // 3. Evaluar Salida Anticipada
                if (!eventos.SALIDA) {
                    if (hSalidaReal < hSalidaTeorica) {
                        horasEfectivas = Math.max(0, hSalidaReal - hEntradaReal - (eventos.COMIDA_INICIO ? comidaTeorica : 0));
                        estatusLabel = "EN CURSO...";
                        colorJornada = "light";
                    }
                } else if (hSalidaReal < hSalidaTeorica) {
                    const minSalidaAnticipada = Math.round((hSalidaTeorica - hSalidaReal) * 60);
                    flagsFaltasOretardos.push(`Salida Temp (${minSalidaAnticipada} min)`);
                    acumuladoMinutosFaltantes += minSalidaAnticipada;
                }

                // Cómputo físico total de horas en planta
                const comidaDescontar = (eventos.COMIDA_INICIO && eventos.COMIDA_FIN) 
                    ? (parseHoraADecimal(eventos.COMIDA_FIN.hora) - parseHoraADecimal(eventos.COMIDA_INICIO.hora))
                    : (eventos.COMIDA_INICIO ? comidaTeorica : 0);
                
                horasEfectivas = Math.max(0, hSalidaReal - hEntradaReal - comidaDescontar);

                // Asignación de saldos del reporte global
                if (acumuladoMinutosFaltantes > 0) {
                    diferencia = Number((-(acumuladoMinutosFaltantes / 60)).toFixed(2));
                    estatusLabel = flagsFaltasOretardos.join(" | ");
                    colorJornada = "danger";
                } else if (eventos.SALIDA && hSalidaReal > hSalidaTeorica) {
                    diferencia = Number((hSalidaReal - hSalidaTeorica).toFixed(2));
                    estatusLabel = `Extra (${diferencia.toFixed(2)} hrs)`;
                    colorJornada = "success";
                } else {
                    diferencia = 0;
                    estatusLabel = "A tiempo";
                    colorJornada = "success";
                }
            }
        } else {
            jornadaAsignadaCalculo = asist.jornada_efectiva || 9.5;
            diferencia = Number((-jornadaAsignadaCalculo).toFixed(2));
            estatusLabel = "Faltante";
            colorJornada = "danger";
        }

        reporteMap[userId].total_horas += horasEfectivas;
        if (diferencia > 0) reporteMap[userId].extras += diferencia;
        else if (diferencia < 0) reporteMap[userId].faltantes += Math.abs(diferencia);        

        reporteMap[userId].asistencias.push({
            fecha: asist.fecha,
            entrada,
            salida,
            salida_comer: salidaComer,
            regreso_comer: regresoComer,
            total_efectivo: Number(horasEfectivas.toFixed(2)),
            jornada_asignada: Number(jornadaAsignadaCalculo.toFixed(2)),
            estatus: estatusLabel,
            color: colorJornada
        });
    }

    return Object.values(reporteMap).map(emp => ({
        ...emp,
        total_horas: Number(emp.total_horas.toFixed(2)),
        extras: Number(emp.extras.toFixed(2)),
        faltantes: Number(emp.faltantes.toFixed(2))
    }));
};

const parseHoraADecimal = (horaStr) => {
    const [hrs, mins, secs] = horaStr.split(':').map(Number);
    return hrs + (mins / 60) + (secs / (secs ? 3600 : 1)); 
};

const generarPdfReporte = async (empleados, periodo, id_tienda, id_empresa) => {
    const db = admin.firestore();
    
    let nombreEmpresa = 'ARAGOBEL';
    let nombreTienda = 'Sucursal';

    try {
        // Disparamos ambas promesas en paralelo para ahorrar la mitad del tiempo de espera
        const [empresaDoc, tiendaDoc] = await Promise.all([
            id_empresa ? db.collection('empresas').doc(id_empresa).get() : null,
            id_tienda ? db.collection('tiendas').doc(id_tienda).get() : null
        ]);

        // Asignamos los nombres directamente si los documentos existen
        if (empresaDoc?.exists) nombreEmpresa = empresaDoc.data().nombre || nombreEmpresa;
        if (tiendaDoc?.exists) nombreTienda = tiendaDoc.data().nombre || nombreTienda;

    } catch (error) {
        console.error('Error al traer contexto dinámico para el PDF:', error);
    }

    // 3. Ahora sí, construimos el contenido del PDF con la data real de la BD
    const contenidoPdf = [
        { text: `REPORTE DE ASISTENCIAS`, style: 'headerTitle' },
        { text: `Empresa: ${nombreEmpresa}`, style: 'headerSubtitleStore' },
        { text: `Tienda: ${nombreTienda}`, style: 'headerSubtitleStore' },
        { text: `Periodo: ${periodo.inicio} al ${periodo.fin}`, style: 'headerSubtitleDates' }
    ];

    // 2. Mapeamos los datos de los empleados a la estructura de pdfmake
    empleados.forEach(emp => {
        contenidoPdf.push({ text: `Empleado: ${emp.nombre}`, style: 'empName' });
        contenidoPdf.push({ 
            text: `Horas Totales: ${emp.total_horas} hrs  |  Extras: ${emp.extras} hrs  |  Faltantes: ${emp.faltantes} hrs`, 
            style: 'empMeta' 
        });

        const tablaAsistencias = {
            table: {
                headerRows: 1,
                widths: ['*', 'auto','auto','auto', 'auto', 'auto', '*'],
                body: [
                    [
                        { text: 'Fecha', style: 'tableHeader' },
                        { text: 'Entrada', style: 'tableHeader' },
                        { text: 'S. Comer', style: 'tableHeader' },
                        { text: 'R. Comer', style: 'tableHeader' },
                        { text: 'Salida', style: 'tableHeader' },
                        { text: 'Total Efectivo', style: 'tableHeader' },
                        { text: 'Estatus', style: 'tableHeader' }
                    ]
                ]
            },
            layout: 'lightHorizontalLines'
        };

        emp.asistencias.forEach(asist => {
            tablaAsistencias.table.body.push([
                { text: asist.fecha, style: 'tableBody' },
                { text: asist.entrada, style: 'tableBody' },
                { text: asist.salida_comer, style: 'tableBody' },
                { text: asist.regreso_comer, style: 'tableBody' },
                { text: asist.salida, style: 'tableBody' },
                { text: `${asist.total_efectivo} hrs`, style: 'tableBody' },
                { text: asist.estatus, style: 'tableBody' }
            ]);
        });

        contenidoPdf.push(tablaAsistencias);
    });

    const estilosAsistencia = {
        empName: { fontSize: 12, bold: true, margin: [0, 15, 0, 3] },
        empMeta: { fontSize: 9, color: '#666', margin: [0, 0, 0, 10] },
        tableHeader: { fontSize: 8, bold: true, fillColor: '#eeeeee', alignment: 'center' }, // Bajamos a 8
        tableBody: { fontSize: 8, alignment: 'center' } // Bajamos a 8 para que quepan holgadamente las 7 columnas
    };

    // USAMOS AWAIT: Esperamos a que el utilitario genere el Buffer completo
    return await pdfGenerator.createReporteBuffer(contenidoPdf, estilosAsistencia);
};

module.exports = { getAll, getById, create, update, remove, getReporteHoras, generarPdfReporte };