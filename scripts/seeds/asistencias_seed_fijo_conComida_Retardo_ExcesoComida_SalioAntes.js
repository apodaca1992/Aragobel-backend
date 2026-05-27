const { db, admin } = require('../../config/firebase'); // Ajusta según tu ruta de config
//node scripts/seeds/asistencias_seed.js
const seedIndividual = async () => {
    const userId = "8wpSXljQTO2fhQ5dNgUe";
    const nombreUsuario = "Jesus Adrian1 Apodaca Campos";
    const tiendaId = "wEKDul8fyZuLeOKBbVSu";
    const empresaId = "MC0veGHPO4j9AAi21lcU";

    const tipo_esquema = "FIJO";
    const fecha = "2026-05-21"; // La fecha base 12- 15
    const ENTRADA = "08:00:00";
    const COMIDA_INICIO = "14:00:00";
    const COMIDA_FIN = "15:00:00";
    const SALIDA = "18:00:00";
    const tolerancia_minutos = 15;
    //checadas
    const ENTRADA_ = "08:20:00";
    const COMIDA_INICIO_ = "14:00:00";
    const COMIDA_FIN_ = "15:30:00";
    const SALIDA_ = "17:30:00";
    

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
        hora_entrada:ENTRADA,
        hora_salida_comer:COMIDA_INICIO,
        hora_regreso_comer:COMIDA_FIN,
        hora_salida:SALIDA,
        tolerancia_minutos,
        // Forzamos el createdAt a la hora de entrada
        createdAt: crearTimestamp(ENTRADA_), 
        updatedAt: crearTimestamp(SALIDA_),
        eventos: {
            ENTRADA: {
                hora: ENTRADA_,
                timestamp: crearTimestamp(ENTRADA_),
                ubicacion: new admin.firestore.GeoPoint(24.8021, -107.394)
            },
            COMIDA_INICIO: {
                hora: COMIDA_INICIO_,
                timestamp: crearTimestamp(COMIDA_INICIO_),
                ubicacion: new admin.firestore.GeoPoint(24.8021, -107.394)
            },
            COMIDA_FIN: {
                hora: COMIDA_FIN_,
                timestamp: crearTimestamp(COMIDA_FIN_),
                ubicacion: new admin.firestore.GeoPoint(24.8021, -107.394)
            },
            SALIDA: {
                hora: SALIDA_,
                timestamp: crearTimestamp(SALIDA_),
                ubicacion: new admin.firestore.GeoPoint(24.8021, -107.394)
            }
        }
    };

    await asistenciaRef.set(data);
    process.exit();
};

seedIndividual();