const admin = require('firebase-admin');
const path = require('path');

// Usamos path.join para evitar errores de rutas entre Windows/Linux
const serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Esto es para que no truene si mandas un campo opcional vacío
db.settings({ ignoreUndefinedProperties: true });

module.exports = { db, admin };