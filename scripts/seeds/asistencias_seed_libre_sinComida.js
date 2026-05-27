const { db, admin } = require('../../config/firebase'); // Ajusta según tu ruta de config
//node scripts/seeds/asistencias_seed.js
const seedIndividual = async () => {
    const userId = "8wpSXljQTO2fhQ5dNgUe";
    const nombreUsuario = "Jesus Adrian1 Apodaca Campos";
    const tiendaId = "wEKDul8fyZuLeOKBbVSu";
    const empresaId = "MC0veGHPO4j9AAi21lcU";

    const tipo_esquema = "LIBRE";
    const jornadaEfectiva = 9.5;
    const tiempoComidaMax = 1.5;
    const fecha = "2026-05-17"; // La fecha base 12- 15
    const ENTRADA = "08:00:00";
    const SALIDA = "14:00:00";
    

    const docId = `${userId}_${fecha}_${tiendaId}`;
    const asistenciaRef = db.collection('asistencias').doc(docId);

    // Función auxiliar para crear Timestamps sin desfase
    // Usamos el formato YYYY-MM-DDTHH:mm:ss sin la Z final
    const crearTimestamp = (hora) => {
        return admin.firestore.Timestamp.fromDate(new Date(`${fecha}T${hora}`));
    };

    const data = {
        activo: 1,
        tipo_esquema: tipo_esquema,
        id_usuario: userId,
        id_tienda: tiendaId,
        id_empresa: empresaId,
        nombre_usuario: nombreUsuario,
        fecha: fecha,
        jornada_efectiva: jornadaEfectiva,
        tiempo_comida_max: tiempoComidaMax,
        // Forzamos el createdAt a la hora de entrada
        createdAt: crearTimestamp(ENTRADA), 
        updatedAt: crearTimestamp(SALIDA),
        eventos: {
            ENTRADA: {
                hora: ENTRADA,
                timestamp: crearTimestamp(ENTRADA),
                ubicacion: new admin.firestore.GeoPoint(24.8021, -107.394)
            },
            SALIDA: {
                hora: SALIDA,
                timestamp: crearTimestamp(SALIDA),
                ubicacion: new admin.firestore.GeoPoint(24.8021, -107.394)
            }
        }
    };

    await asistenciaRef.set(data);
    process.exit();
};

seedIndividual();