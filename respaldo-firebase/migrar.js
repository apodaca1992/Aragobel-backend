// se necesita primero logearme en la terminal con 
// npx firebase login
// npm run db:sync
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process'); // Para ejecutar comandos de consola automáticamente

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

        // ---------------------------------------------------------------------
        // 🔄 PASO 0: CLONACIÓN AUTOMÁTICA DE ÍNDICES COMPUESTOS
        // ---------------------------------------------------------------------
        console.log('📐 Sincronizando índices compuestos de Firestore...');
        
        // Leemos los IDs de proyecto directamente de tus archivos JSON de credenciales
        const prodProjectId = JSON.parse(fs.readFileSync(prodAccountKey)).project_id;
        const qaProjectId = JSON.parse(fs.readFileSync(qaAccountKey)).project_id;
        const indexesFile = path.join(__dirname, 'firestore.indexes.json');
        
        // Creamos una configuración temporal para que Firebase CLI reconozca el destino de despliegue
        const configTemporal = path.join(__dirname, 'firebase.json');
        fs.writeFileSync(configTemporal, JSON.stringify({
            firestore: {
                indexes: "firestore.indexes.json"
            }
        }, null, 2));

        console.log(`   • Exportando índices de Producción (${prodProjectId})...`);
        // Autenticación automática usando la llave JSON de producción
        execSync(`npx firebase firestore:indexes --project ${prodProjectId} > ${indexesFile}`, { 
            stdio: 'inherit',
            env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: prodAccountKey }
        });

        console.log(`   • Importando y desplegando índices en QA (${qaProjectId})...`);
        // 🌟 SOLUCIÓN DEFINITIVA: Quitamos el objeto 'env' para que Firebase CLI use de forma nativa tu sesión
        // activa de la terminal (tu usuario administrador de Firebase en la Mac).
        execSync(`npx firebase deploy --only firestore:indexes --project ${qaProjectId} --config ${configTemporal}`, { 
            stdio: 'inherit'
        });
        
        // Limpiamos los archivos temporales para dejar la carpeta impecable
        if (fs.existsSync(indexesFile)) fs.unlinkSync(indexesFile);
        if (fs.existsSync(configTemporal)) fs.unlinkSync(configTemporal);
        
        console.log('✅ Índices compuestos replicados y construyéndose en QA.');

        // ---------------------------------------------------------------------
        // 1. INICIALIZAR APP DE PRODUCCIÓN Y LEER DATOS
        // ---------------------------------------------------------------------
        console.log('\n📥 Conectando y extrayendo datos de Firebase PRODUCCIÓN...');
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
        
        await appProd.delete();
        console.log('💾 Datos de producción cargados en memoria con éxito.');

        // ---------------------------------------------------------------------
        // 2. INICIALIZAR APP DE QA E INYECTAR DATOS
        // ---------------------------------------------------------------------
        console.log('\n📤 Conectando e insertando datos en Firebase QA...');
        const appQa = admin.initializeApp({
            credential: admin.credential.cert(qaAccountKey)
        }, 'qa-app');
        
        const dbQa = appQa.firestore();

        for (const nombreCol of COLECCIONES) {
            const documentos = todoElRespaldo[nombreCol];
            if (!documentos || documentos.length === 0) continue;

            console.log(`   • Escribiendo colección: ${nombreCol} (${documentos.length} docs)...`);
            
            let batch = dbQa.batch();
            let contador = 0;

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
        console.log('\n✅ ¡ÉXITO TOTAL! Tu base de datos e índices de QA son ahora un clon exacto de Producción.');

    } catch (error) {
        console.error('\n❌ ERROR DURANTE LA MIGRACIÓN:', error.message);
        process.exit(1);
    }
}

ejecutarMigracion();