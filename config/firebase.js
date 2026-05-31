const admin = require('firebase-admin');

try {
    // 1. Limpiamos y formateamos los saltos de línea de la llave privada (\n)
    const privateKey = process.env.FIREBASE_PRIVATE_KEY 
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
        : undefined;

    // 2. Validamos que existan las 3 variables críticas en el entorno actual
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
        
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            })
        });

        console.log("✅ Firebase inicializado correctamente mediante Variables de Entorno");
    } else {
        // Lanzamos un error explícito si falta alguna variable para que caiga en el catch
        throw new Error("Faltan variables de entorno críticas (PROJECT_ID, CLIENT_EMAIL o PRIVATE_KEY).");
    }

} catch (error) {
    console.error("❌ Error al inicializar Firebase:", error.message);
    process.exit(1); // Detiene la ejecución para que revises los logs de inmediato
}

const db = admin.firestore();

// Mantener tu configuración para ignorar propiedades indefinidas
db.settings({ ignoreUndefinedProperties: true });

module.exports = { db, admin };