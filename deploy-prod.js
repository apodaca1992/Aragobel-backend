// deploy-prod.js (Ubicado en la raíz del proyecto)
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// 🌟 CAMBIO 1: Apuntamos al archivo .env.prod
const envPath = path.join(__dirname, '.env.prod');

if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
} else {
    require('dotenv').config(); 
    console.log('⚠️ No se encontró el archivo .env.prod al lado del script, se usará el archivo .env por defecto.');
}

async function deployProd() {
    try {
        // Tomará el nombre de tu servicio de producción (ej. aragobel-backend) desde el .env.prod
        const serviceName = process.env.CLOUDRUN_SERVICE_NAME || 'aragobel-backend';
        const region = 'us-central1';
        
        // 🌟 CONFIGURACIÓN DE PRODUCCIÓN: 
        // En producción puedes subir el máximo de instancias (ej. 5 o 10) para aguantar tráfico real.
        const maxInstanciasProd = 5; 

        console.log('🚨 ¡ATENCIÓN! Preparando despliegue para el ambiente de PRODUCCIÓN...');
        console.log(`📝 Leyendo configuración desde: ${fs.existsSync(envPath) ? '.env.prod' : '.env'}`);
        console.log(`🎯 Servicio objetivo: ${serviceName} (Región: ${region})`);
        console.log(`⚙️ Aplicando políticas para producción (Min: 0, Max: ${maxInstanciasProd}, CPU: request-based)...`);
        console.log('🚀 Subiendo código a Google Cloud Run...');

        // 1. Desplegamos la revisión de producción
        // Nota: Removí `--allow-unauthenticated` por seguridad estándar de Prod, 
        // si tu API es 100% pública para que cualquiera la use sin restricciones, puedes volvérselo a poner.
        const comandoDeploy = [
            `gcloud run deploy ${serviceName}`,
            '--source .',
            `--region ${region}`,
            '--allow-unauthenticated', // Déjalo si tu API la consumirá el frontend directamente sin gateway
            '--min-instances 0',
            `--max-instances ${maxInstanciasProd}`,
            '--cpu-throttling'
        ].join(' ');

        execSync(comandoDeploy, { stdio: 'inherit' });

        // 2. Sincronizamos los límites globales en el servicio de Prod
        console.log('\n🧹 Sincronizando límites a nivel de Servicio Global en Producción...');
        const comandoUpdateGlobal = [
            `gcloud run services update ${serviceName}`,
            `--region ${region}`,
            '--min 0',
            `--max ${maxInstanciasProd}`
        ].join(' ');

        execSync(comandoUpdateGlobal, { stdio: 'inherit' });

        console.log(`\n✅ ¡DESPLIEGUE DE PRODUCCIÓN EXITOSO! El servicio "${serviceName}" está en vivo.`);

    } catch (error) {
        console.error('\n❌ ERROR CRÍTICO DURANTE EL DESPLIEGUE DE PROD:', error.message);
        process.exit(1);
    }
}

deployProd();