// deploy-qa.js (Ubicado en la raíz del proyecto)
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Al estar en la raíz, el .env.qa está en la misma carpeta que este script
const envPath = path.join(__dirname, '.env.qa');

// Cargamos las variables manualmente desde .env.qa si el archivo existe
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
} else {
    require('dotenv').config(); 
    console.log('⚠️ No se encontró el archivo .env.qa al lado del script, se usará el archivo .env por defecto.');
}

async function deployQA() {
    try {
        const serviceName = process.env.CLOUDRUN_SERVICE_NAME || 'aragobel-backend-qa';
        const region = 'us-central1';

        console.log('📦 Preparando despliegue para el ambiente de QA...');
        console.log(`📝 Leyendo configuración desde: ${fs.existsSync(envPath) ? '.env.qa' : '.env'}`);
        console.log(`🎯 Servicio objetivo: ${serviceName} (Región: ${region})`);
        console.log('⚙️ Aplicando políticas de ahorro de costos en la nueva revisión...');
        console.log('🚀 Subiendo código a Google Cloud Run...');

        // 1. Desplegamos la revisión actual de código con sus respectivos límites
        const comandoDeploy = [
            `gcloud run deploy ${serviceName}`,
            '--source .',
            `--region ${region}`,
            '--allow-unauthenticated',
            '--min-instances 0',
            '--max-instances 2',
            '--cpu-throttling'
        ].join(' ');

        execSync(comandoDeploy, { stdio: 'inherit' });

        // 🌟 2. PASO DE CONTROL TOTAL: Actualizamos la configuración global del servicio.
        // Usamos '--min 0' y '--max 2' para sobreescribir el límite del servicio e impactar la interfaz visual.
        console.log('\n🧹 Sincronizando límites a nivel de Servicio Global para actualizar el panel de GCP...');
        const comandoUpdateGlobal = [
            `gcloud run services update ${serviceName}`,
            `--region ${region}`,
            '--min 0',
            '--max 2'
        ].join(' ');

        execSync(comandoUpdateGlobal, { stdio: 'inherit' });

        console.log(`\n✅ ¡DESPLIEGUE COMPLETO! El servicio "${serviceName}" está blindado a máximo 2 instancias globales.`);

    } catch (error) {
        console.error('\n❌ ERROR DURANTE EL DESPLIEGUE:', error.message);
        process.exit(1);
    }
}

deployQA();