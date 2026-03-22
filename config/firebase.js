const admin = require('firebase-admin');

// CRITICAL: Esta variable de entorno le dice al SDK que use el emulador local
if (process.env.NODE_ENV !== 'production') {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    console.log('--- CONECTADO AL EMULADOR DE FIRESTORE ---');
}

admin.initializeApp({
    projectId: 'demo-aragobel', // El ID que usaste en la inicialización
});

const db = admin.firestore();

module.exports = { db, admin };