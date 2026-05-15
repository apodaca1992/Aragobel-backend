const { db, admin } = require('../../config/firebase'); // Ajusta según tu ruta de config
//node scripts/seeds/asistencias_seed.js
const seedIndividual = async () => {
    const userId = "blIL9Ts6MeEbubvhnVpP";
    const tiendaId = "wEKDul8fyZuLeOKBbVSu";
    const empresaId = "MC0veGHPO4j9AAi21lcU";
    const nombreUsuario = "Jesus Adrian Apodaca Campos";
    const jornadaEfectiva = 9.5;
    const tiempoComidaMax = 1.5;
    const fecha = "2026-05-12"; // La fecha base

    const docId = `${userId}_${fecha}_${tiendaId}`;
    const asistenciaRef = db.collection('asistencias').doc(docId);

    // Función auxiliar para crear Timestamps sin desfase
    // Usamos el formato YYYY-MM-DDTHH:mm:ss sin la Z final
    const crearTimestamp = (hora) => {
        return admin.firestore.Timestamp.fromDate(new Date(`${fecha}T${hora}`));
    };

    const data = {
        activo: 1,
        id_usuario: userId,
        id_tienda: tiendaId,
        id_empresa: empresaId,
        nombre_usuario: nombreUsuario,
        fecha: fecha,
        jornada_efectiva: jornadaEfectiva,
        tiempo_comida_max: tiempoComidaMax,
        // Forzamos el createdAt a la hora de entrada
        createdAt: crearTimestamp("08:00:15"), 
        updatedAt: crearTimestamp("18:30:45"),
        eventos: {
            ENTRADA: {
                hora: "08:00:15",
                timestamp: crearTimestamp("08:00:15"),
                ubicacion: new admin.firestore.GeoPoint(24.8021, -107.394)
            },
            COMIDA_INICIO: {
                hora: "13:00:00",
                timestamp: crearTimestamp("13:00:00"),
                ubicacion: new admin.firestore.GeoPoint(24.8021, -107.394)
            },
            COMIDA_FIN: {
                hora: "14:30:00",
                timestamp: crearTimestamp("14:30:00"),
                ubicacion: new admin.firestore.GeoPoint(24.8021, -107.394)
            },
            SALIDA: {
                hora: "18:30:45",
                timestamp: crearTimestamp("18:30:45"),
                ubicacion: new admin.firestore.GeoPoint(24.8021, -107.394)
            }
        }
    };

    await asistenciaRef.set(data);
    process.exit();
};

seedIndividual();