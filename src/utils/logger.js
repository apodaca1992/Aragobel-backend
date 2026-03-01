const winston = require('winston');

// 1. Definir los niveles de log y sus colores (opcional pero útil para consola)
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// 2. Formato para Desarrollo (Legible para humanos)
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// 3. Formato para Producción (JSON estructurado para logs centralizados)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }), // Captura el stack trace automáticamente
  winston.format.json()
);

// 4. Crear la instancia del logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  format: process.env.NODE_ENV === 'development' ? devFormat : prodFormat,
  transports: [
    // Escribir errores en un archivo separado
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB por archivo
      maxFiles: 5 
    }),
    // Escribir todos los logs en un archivo combinado
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// 5. Si no estamos en producción, también mostrar en consola
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console());
}

module.exports = logger;