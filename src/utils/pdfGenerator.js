const PdfPrinter = require('pdfmake'); 

class PdfGenerator {
    constructor() {
        this.fonts = {
            Helvetica: {
                normal: 'Helvetica',
                bold: 'Helvetica-Bold',
                italics: 'Helvetica-Oblique',
                bolditalics: 'Helvetica-BoldOblique'
            }
        };
    }

    /**
     * Genera un Buffer de PDF de manera asíncrona usando Promesas
     * @param {Array} content - Estructura del contenido del PDF
     * @param {Object} customStyles - Estilos personalizados que sobreescriben a los por defecto
     * @param {Object} opcionesExtra - Configuraciones de página extra como pageOrientation, pageSize, etc.
     */
    async createReporteBuffer(content, customStyles = {}, opcionesExtra = {}) {
        const printer = new PdfPrinter(this.fonts);

        const defaultStyles = {
            headerTitle: { fontSize: 16, bold: true, alignment: 'center', margin: [0, 0, 0, 5] },
            headerSubtitle: { fontSize: 10, alignment: 'center', margin: [0, 0, 0, 20], color: '#555' },
            tableHeader: { fontSize: 9, bold: true, fillColor: '#eeeeee', alignment: 'center' },
            tableBody: { fontSize: 9, alignment: 'center' },
            ...customStyles
        };

        const docDefinition = {
            content: content,
            styles: defaultStyles,
            defaultStyle: { font: 'Helvetica' },
            ...opcionesExtra // <--- AQUÍ: Combinamos propiedades como pageOrientation: 'landscape' de forma dinámica
        };

        // En la versión clásica de Node, compilamos el documento usando createPdfKitDocument
        const pdfDoc = printer.createPdfKitDocument(docDefinition);

        // Convertimos el flujo de datos del documento en un Buffer binario para el async/await
        return new Promise((resolve, reject) => {
            const chunks = [];
            
            pdfDoc.on('data', (chunk) => chunks.push(chunk));
            pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
            pdfDoc.on('error', (err) => reject(err));
            
            pdfDoc.end(); // Finalizamos el flujo de escritura
        });
    }
}

module.exports = new PdfGenerator();