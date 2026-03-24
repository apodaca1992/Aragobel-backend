const { db } = require('../../config/firebase');

/**
 * Función auxiliar privada para convertir Timestamps de Firebase a ISO Strings
 * de forma recursiva (funciona para objetos anidados como 'permisos')
 */
const formatData = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    // 1. Si es un Timestamp de Firestore (tiene el método toDate)
    if (typeof obj.toDate === 'function') {
        return obj.toDate().toISOString();
    }

    // 2. Si es un objeto Date nativo de JS
    if (obj instanceof Date) {
        return obj.toISOString();
    }

    // 3. Si es un Array, procesamos cada elemento
    if (Array.isArray(obj)) {
        return obj.map(formatData);
    }

    // 4. Si es un objeto literal, procesamos sus llaves
    const newObj = {};
    for (const key in obj) {
        newObj[key] = formatData(obj[key]);
    }
    return newObj;
};

const Firestore = {

    /**
     * Trae documentos activos con Paginación y Cursors
     * @param {string} coleccion - Nombre de la colección
     * @param {Object} opciones - { filtros, orderBy, orderDir, limit, lastDocId }
     */
    findAll: async (coleccion, opciones = {}) => {
        const { 
            filtros = { activo: 1}, 
            orderBy = 'createdAt', 
            orderDir = 'desc', 
            limit = 10,
            lastDocId = null // El ID del último documento de la página anterior
        } = opciones;

        let query = db.collection(coleccion);

        // 1. Filtros
        Object.keys(filtros).forEach(key => {

            let valor = filtros[key];

            // Si el valor es un string que parece un número, lo convertimos
            // Ejemplo: "1" -> 1, "25.5" -> 25.5
            if (typeof valor === 'string' && valor.trim() !== '' && !isNaN(valor)) {
                valor = Number(valor);
            }

            // Si el valor es "true" o "false" (strings), convertirlos a booleanos
            if (valor === 'true') valor = true;
            if (valor === 'false') valor = false;

            query = query.where(key, '==', valor);
        });

        // 2. Orden (Obligatorio para paginar)
        query = query.orderBy(orderBy, orderDir);

        // 3. PAGINACIÓN: Si recibimos el ID del último doc, empezamos después de él
        if (lastDocId) {
            const lastDoc = await db.collection(coleccion).doc(lastDocId).get();
            if (lastDoc.exists) {
                query = query.startAfter(lastDoc);
            }
        }

        // 4. Límite
        query = query.limit(Number(limit));

        const snapshot = await query.get();

        if (snapshot.empty) return [];

        return snapshot.docs.map(doc => formatData({
            id: doc.id,
            ...doc.data()
        }));
    },

    /**
     * Busca un único documento en una colección por campo/valor
     */
    findOne: async (coleccion, campo, valor) => {        
        const { docs } = await db.collection(coleccion)
            .where(campo, '==', valor)
            .where('activo', '==', 1)
            .limit(1)
            .get();

        return docs.length ? formatData({ id: docs[0].id, ...docs[0].data() }) : null;    
    },

    /**
     * (Opcional) Busca un documento directamente por su ID (UUID)
     */
    findByPk: async (coleccion, id) => {
        const doc = await db.collection(coleccion).doc(id).get();
        // Verificamos que el documento exista Y que esté activo
        if (!doc.exists || doc.data().activo === 0) {
            return null;
        }
        return formatData({ id: doc.id, ...doc.data() });
    },

    /**
     * Crea un nuevo documento en una colección
     * @param {string} coleccion - Nombre de la colección
     * @param {Object} datos - Objeto con la información a guardar
     * @param {string} id - (Opcional) ID específico para el documento
     */
    create: async (coleccion, datos, id = null) => {
        // Si mandas un ID (tu UUID), usamos .doc(id), si no, Firebase genera uno
        const docRef = id 
            ? db.collection(coleccion).doc(id) 
            : db.collection(coleccion).doc();

        const ahora = new Date();
        const documentoFinal = {
            ...datos,
            createdAt: ahora,
            updatedAt: ahora,
            activo: 1
        };
        
        await docRef.set(documentoFinal);
        return formatData({ id: docRef.id, ...documentoFinal });      
    },

    /**
     * Actualiza un documento en una colección
     * @param {string} coleccion - Nombre de la colección
     * @param {string} id - ID específico para el documento
     * @param {Object} datos - Objeto con la información a actualizar
     */
    update: async (coleccion, id, datos) => {
        const docRef = db.collection(coleccion).doc(id);
        const updateData = {
            ...datos,
            updatedAt: new Date()
        };
        await docRef.update(updateData);
        return formatData({ id, ...updateData });
    },
    
    /**
     * Borrado Lógico: Desactiva el documento sin eliminarlo
     */
    softDelete: async (coleccion, id) => {
        const docRef = db.collection(coleccion).doc(id);
        const updateData = {
            activo: 0,
            deletedAt: new Date(),
            updatedAt: new Date()
        };
        await docRef.update(updateData);
        return formatData({ id, ...updateData });        
    },
};

module.exports = Firestore;