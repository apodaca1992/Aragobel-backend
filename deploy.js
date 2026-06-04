// deploy.js (Ubicado en la raíz del proyecto)
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

async function deploy() {
    // 1. Detectamos el ambiente dinámicamente desde el comando de NPM (qa o prod)
    const ambiente = (process.argv[2] || '').toLowerCase();

    if (ambiente !== 'qa' && ambiente !== 'prod') {
        console.error('❌ ERROR CRÍTICO: Debes especificar un ambiente válido. Usa: "qa" o "prod".');
        process.exit(1);
    }

    // 2. Apuntamos y cargamos el archivo de entorno correspondiente (.env.qa o .env.prod)
    const envFile = `.env.${ambiente}`;
    const envPath = path.join(__dirname, envFile);

    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
    } else {
        require('dotenv').config(); 
        console.log(`⚠️ No se encontró el archivo ${envFile}, se usará el archivo .env genérico.`);
    }

    try {
        // 🌟 3. EXTRACCIÓN TOTAL DESDE TU ESTRUCTURA DE VARIABLES DEL .ENV (Sin PORT)
        const serviceName = process.env.CLOUDRUN_SERVICE_NAME;
        const region = process.env.CLOUDRUN_REGION || 'us-central1';
        const minInstancias = process.env.CLOUDRUN_MIN_INSTANCES || '0';
        const maxInstancias = process.env.CLOUDRUN_MAX_INSTANCES || '2';

        // Lógica de CPU asignada por tu variable CLOUDRUN_CPU_ALWAYS_ON
        const cpuAlwaysOn = process.env.CLOUDRUN_CPU_ALWAYS_ON === 'true';
        const cpuFlag = cpuAlwaysOn ? '--no-cpu-throttling' : '--cpu-throttling';

        // Control de errores en caso de que falte la variable más importante
        if (!serviceName) {
            console.error(`❌ ERROR: CLOUDRUN_SERVICE_NAME no está definido en tu archivo ${envFile}`);
            process.exit(1);
        }

        // Títulos estéticos diferenciados para la terminal
        if (ambiente === 'prod') {
            console.log('🚨 ¡ATENCIÓN! Preparando despliegue para el ambiente de PRODUCCIÓN...');
        } else {
            console.log('📦 Preparando despliegue para el ambiente de QA...');
        }

        console.log(`📝 Leyendo configuración desde: ${fs.existsSync(envPath) ? envFile : '.env'}`);
        console.log(`🎯 Servicio objetivo: ${serviceName}`);
        console.log(`🌐 Región asignada:   ${region}`);
        console.log(`⚡ Modo de CPU:       ${cpuAlwaysOn ? 'Siempre Asignado (Rendimiento)' : 'Basado en Solicitudes (Ahorro)'}`);
        console.log(`⚙️  Límites de escala:  Min: ${minInstancias}, Max: ${maxInstancias}`);
        console.log('🚀 Subiendo código a Google Cloud Run...');

        // 🌟 4. Comando de despliegue sin la bandera --port
        const comandoDeploy = [
            `gcloud run deploy ${serviceName}`,
            '--source .',
            `--region ${region}`,
            '--allow-unauthenticated',
            `--min-instances ${minInstancias}`,
            `--max-instances ${maxInstancias}`,
            cpuFlag
        ].join(' ');

        execSync(comandoDeploy, { stdio: 'inherit' });

        // 🌟 5. Sincronización global del servicio para forzar la actualización visual en GCP
        console.log(`\n🧹 Sincronizando límites a nivel de Servicio Global en [${ambiente.toUpperCase()}]...`);
        const comandoUpdateGlobal = [
            `gcloud run services update ${serviceName}`,
            `--region ${region}`,
            `--min ${minInstancias}`,
            `--max ${maxInstancias}`
        ].join(' ');

        execSync(comandoUpdateGlobal, { stdio: 'inherit' });

        console.log(`\n✅ ¡DESPLIEGUE COMPLETO! El servicio de ${ambiente.toUpperCase()} ("${serviceName}") está listo.`);

    } catch (error) {
        console.error(`\n❌ ERROR CRÍTICO DURANTE EL DESPLIEGUE DE ${ambiente.toUpperCase()}:`, error.message);
        process.exit(1);
    }
}

deploy();