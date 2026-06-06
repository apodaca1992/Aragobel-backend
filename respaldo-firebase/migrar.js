// respaldo-firebase/migrar.js
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

async function ejecutarMigracion() {
    // 1. LEER LA DIRECCIÓN DE LA MIGRACIÓN
    const direccion = (process.argv[2] || '').toLowerCase();

    if (direccion !== 'to-qa' && direccion !== 'to-prod') {
        console.error('❌ ERROR CRÍTICO: Debes especificar la dirección de migración válida: "to-qa" o "to-prod".');
        process.exit(1);
    }

    // Cargamos el entorno dependiendo del destino para tener las configuraciones correctas
    const ambienteTarget = direccion === 'to-qa' ? 'qa' : 'prod';
    const envPath = path.join(process.cwd(), `.env.${ambienteTarget}`);

    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
    } else {
        require('dotenv').config();
    }

    try {
        // Mapeamos las rutas absolutas de los archivos JSON desde las variables fijas
        const rutaQA = process.env.FIRESTORE_CREDENTIALS_QA 
            ? path.resolve(process.cwd(), process.env.FIRESTORE_CREDENTIALS_QA)
            : path.join(__dirname, 'qa-credentials.json');

        const rutaProd = process.env.FIRESTORE_CREDENTIALS_PROD 
            ? path.resolve(process.cwd(), process.env.FIRESTORE_CREDENTIALS_PROD)
            : path.join(__dirname, 'prod-credentials.json');

        if (!fs.existsSync(rutaQA) || !fs.existsSync(rutaProd)) {
            throw new Error(`Faltan los archivos de credenciales JSON en las rutas especificadas.`);
        }

        // 2. DETERMINAR QUIÉN ES ORIGEN Y QUIÉN DESTINO DINÁMICAMENTE
        const esHaciaProd = direccion === 'to-prod';
        
        const rutaOrigen = esHaciaProd ? rutaQA : rutaProd;
        const rutaDestino = esHaciaProd ? rutaProd : rutaQA;
        
        const nombreOrigen = esHaciaProd ? 'QA' : 'PRODUCCIÓN';
        const nombreDestino = esHaciaProd ? 'PRODUCCIÓN' : 'QA';

        // 🌟 NUEVO: Leer la bandera directamente desde tu bloque del archivo .env
        const soloIndices = process.env.FIRESTORE_INDEXES_ONLY === 'true';

        const projectIdOrigen = JSON.parse(fs.readFileSync(rutaOrigen)).project_id;
        const projectIdDestino = JSON.parse(fs.readFileSync(rutaDestino)).project_id;

        // Cambiamos el título en consola según lo configurado en el .env
        if (soloIndices) {
            console.log(`📐 Modo Estructural (.env): Sincronizando ÚNICAMENTE ÍNDICES [${nombreOrigen} ➡️  ${nombreDestino}]...`);
        } else {
            console.log(`🚀 Iniciando clonación nativa completa de Firestore [${nombreOrigen} ➡️  ${nombreDestino}]...`);
        }

        // ---------------------------------------------------------------------
        // 🔄 PASO 0: CLONACIÓN AUTOMÁTICA DE ÍNDICES COMPUESTOS
        // ---------------------------------------------------------------------
        console.log('\n📐 Sincronizando índices compuestos de Firestore...');
        const indexesFile = path.join(__dirname, 'firestore.indexes.json');
        const configTemporal = path.join(__dirname, 'firebase.json');
        
        fs.writeFileSync(configTemporal, JSON.stringify({ firestore: { indexes: "firestore.indexes.json" } }, null, 2));

        console.log(`   • Exportando índices desde Origen (${projectIdOrigen})...`);
        execSync(`npx firebase firestore:indexes --project ${projectIdOrigen} > ${indexesFile}`, { 
            stdio: 'inherit',
            env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: rutaOrigen }
        });

        console.log(`   • Importando y desplegando índices en Destino (${projectIdDestino})...`);
        execSync(`npx firebase deploy --only firestore:indexes --project ${projectIdDestino} --config ${configTemporal}`, { 
            stdio: 'inherit'
        });
        
        if (fs.existsSync(indexesFile)) fs.unlinkSync(indexesFile);
        if (fs.existsSync(configTemporal)) fs.unlinkSync(configTemporal);
        console.log('✅ Índices compuestos replicados con éxito.');

        // 🌟 NUEVO: Si en el .env pusiste FIRESTORE_INDEXES_ONLY=true, cortamos aquí de forma segura
        if (soloIndices) {
            console.log(`\n✅ ¡PROCESO TERMINADO POR CONFIGURACIÓN DEL .ENV! Los índices de ${nombreDestino} se actualizaron sin alterar datos.`);
            return; 
        }

        // ---------------------------------------------------------------------
        // 🛠️ CONEXIÓN DE INFRAESTRUCTURA Y DETECCIÓN DE COLECCIONES
        // ---------------------------------------------------------------------
        console.log(`\n📥 Conectando a Firebase Origen (${nombreOrigen})...`);
        const appOrigen = admin.initializeApp({ credential: admin.credential.cert(rutaOrigen) }, 'origen-app');
        const dbOrigen = appOrigen.firestore();

        let coleccionesAMigrar = [];
        const descargarTodas = process.env.FIRESTORE_MIGRATE_ALL === 'true';

        if (descargarTodas) {
            console.log(`🔍 Modo: Descargar TODO activo. Escaneando base de datos de ${nombreOrigen}...`);
            const coleccionesObtenidas = await dbOrigen.listCollections();
            coleccionesAMigrar = coleccionesObtenidas.map(col => col.id);
            console.log(`📋 Colecciones detectadas automáticamente (${coleccionesAMigrar.length}): [${coleccionesAMigrar.join(', ')}]`);
        } else {
            console.log('🔍 Modo: Filtrado manual activo. Leyendo colecciones desde el .env...');
            const filtradas = process.env.FIRESTORE_COLECCIONES_FILTRADAS || '';
            coleccionesAMigrar = filtradas.split(',').map(c => c.trim()).filter(c => c.length > 0);
            
            if (coleccionesAMigrar.length === 0) {
                throw new Error('El modo de filtrado manual está activo pero la variable FIRESTORE_COLECCIONES_FILTRADAS está vacía.');
            }
            console.log(`📋 Colecciones configuradas para migrar (${coleccionesAMigrar.length}): [${coleccionesAMigrar.join(', ')}]`);
        }

        // ---------------------------------------------------------------------
        // 3. EXTRACCIÓN DE DATOS DESDE ORIGEN
        // ---------------------------------------------------------------------
        const todoElRespaldo = {};

        for (const nombreCol of coleccionesAMigrar) {
            console.log(`   • Leyendo colección origen: ${nombreCol}...`);
            const snapshot = await dbOrigen.collection(nombreCol).get();
            
            todoElRespaldo[nombreCol] = [];
            snapshot.forEach(doc => {
                todoElRespaldo[nombreCol].push({
                    id: doc.id,
                    data: doc.data()
                });
            });
        }
        
        await appOrigen.delete();
        console.log(`💾 Datos de ${nombreOrigen} cargados en memoria con éxito.`);

        // ---------------------------------------------------------------------
        // 4. CONEXIÓN E INYECCIÓN DE DATOS EN DESTINO
        // ---------------------------------------------------------------------
        console.log(`\n📤 Conectando e insertando datos en Firebase Destino (${nombreDestino})...`);
        const appDestino = admin.initializeApp({ credential: admin.credential.cert(rutaDestino) }, 'destino-app');
        const dbDestino = appDestino.firestore();

        for (const nombreCol of coleccionesAMigrar) {
            const documentos = todoElRespaldo[nombreCol];
            if (!documentos || documentos.length === 0) {
                console.log(`   ⚠️ La colección "${nombreCol}" está vacía en el origen. Saltando.`);
                continue;
            }

            console.log(`   • Escribiendo en destino: ${nombreCol} (${documentos.length} docs)...`);
            
            let batch = dbDestino.batch();
            let contador = 0;

            for (const doc of documentos) {
                const docRef = dbDestino.collection(nombreCol).doc(doc.id);
                batch.set(docRef, doc.data);
                contador++;

                if (contador === 400) {
                    await batch.commit();
                    batch = dbDestino.batch();
                    contador = 0;
                }
            }
            
            if (contador > 0) {
                await batch.commit();
            }
        }

        await appDestino.delete();
        console.log(`\n✅ ¡MIGRACIÓN COMPLETADA CON ÉXITO! La base de datos de ${nombreDestino} es ahora un clon exacto de ${nombreOrigen}.`);

    } catch (error) {
        console.error('\n❌ ERROR DURANTE LA MIGRACIÓN:', error.message);
        process.exit(1);
    }
}

ejecutarMigracion();