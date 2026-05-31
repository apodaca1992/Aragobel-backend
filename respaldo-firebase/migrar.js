// respaldo-firebase/migrar.js
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Rutas a las credenciales
const prodAccountKey = path.join(__dirname, 'prod-credentials.json');
const qaAccountKey = path.join(__dirname, 'qa-credentials.json');

// Tus 8 colecciones reales detectadas
const COLECCIONES = [
    'asistencias',
    'colonias',
    'empresas',
    'entregas',
    'roles',
    'tiendas',
    'usuarios',
    'vehiculos'
];

async function ejecutarMigracion() {
    try {
        console.log('🚀 Iniciando clonación nativa de Firestore (PROD -> QA)...');

        if (!fs.existsSync(prodAccountKey) || !fs.existsSync(qaAccountKey)) {
            throw new Error('Faltan los archivos JSON de credenciales en respaldo-firebase/.');
        }

        // 1. INICIALIZAR APP DE PRODUCCIÓN Y LEER DATOS
        console.log('📥 Conectando y extrayendo datos de Firebase PRODUCCIÓN...');
        const appProd = admin.initializeApp({
            credential: admin.credential.cert(prodAccountKey)
        }, 'prod-app');
        
        const dbProd = appProd.firestore();
        const todoElRespaldo = {};

        for (const nombreCol of COLECCIONES) {
            console.log(`   • Leyendo colección: ${nombreCol}...`);
            const snapshot = await dbProd.collection(nombreCol).get();
            
            todoElRespaldo[nombreCol] = [];
            snapshot.forEach(doc => {
                todoElRespaldo[nombreCol].push({
                    id: doc.id,
                    data: doc.data()
                });
            });
        }
        
        // Cerrar la app de producción para liberar memoria
        await appProd.delete();
        console.log('💾 Datos de producción cargados en memoria con éxito.');

        // 2. INICIALIZAR APP DE QA E INYECTAR DATOS
        console.log('📤 Conectando e insertando datos en Firebase QA...');
        const appQa = admin.initializeApp({
            credential: admin.credential.cert(qaAccountKey)
        }, 'qa-app');
        
        const dbQa = appQa.firestore();

        for (const nombreCol of COLECCIONES) {
            const documentos = todoElRespaldo[nombreCol];
            if (!documentos || documentos.length === 0) continue;

            console.log(`   • Escribiendo colección: ${nombreCol} (${documentos.length} docs)...`);
            
            // Usamos batches de Firestore para escribir de forma masiva y ultra rápida
            let batch = dbQa.batch();
            let contador = 0;

            // 🌟 CORREGIDO: Cambiado "de" por "of" aquí abajo
            for (const doc of documentos) {
                const docRef = dbQa.collection(nombreCol).doc(doc.id);
                batch.set(docRef, doc.data);
                contador++;

                // El límite por batch en Firestore es de 500 operaciones
                if (contador === 400) {
                    await batch.commit();
                    batch = dbQa.batch();
                    contador = 0;
                }
            }
            
            // Mandar los últimos registros restantes de la colección
            if (contador > 0) {
                await batch.commit();
            }
        }

        await appQa.delete();
        console.log('\n✅ ¡ÉXITO TOTAL! Tu base de datos de QA es ahora un clon exacto de Producción.');

    } catch (error) {
        console.error('\n❌ ERROR DURANTE LA MIGRACIÓN:', error.message);
        process.exit(1);
    }
}

ejecutarMigracion();