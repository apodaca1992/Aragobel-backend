const admin = require('firebase-admin');
const path = require('path');
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
try {
    // Al estar en la misma carpeta, usamos __dirname y especificamos .json
    const serviceAccount = require(serviceAccountPath);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    console.log("✅ Firebase inicializado correctamente");
} catch (error) {
    console.error("❌ Error al cargar la llave de Firebase:", error.message);
    console.error(error);
    process.exit(1); // Esto hará que el log nos muestre el error exacto
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

module.exports = { db, admin };