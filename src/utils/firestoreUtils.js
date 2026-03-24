const { db } = require('../../config/firebase');

const Firestore = {

    /**
     * Trae documentos activos con Paginación y Cursors
     * @param {string} coleccion - Nombre de la colección
     * @param {Object} opciones - { filtros, orderBy, orderDir, limit, lastDocId }
     */
    findAll: async (coleccion, opciones = {}) => {
        const { 
            filtros = {}, 
            orderBy = 'createdAt', 
            orderDir = 'desc', 
            limit = 10,
            lastDocId = null // El ID del último documento de la página anterior
        } = opciones;

        let query = db.collection(coleccion).where('activo', '==', 1);

        // 1. Filtros
        Object.keys(filtros).forEach(key => {
            query = query.where(key, '==', filtros[key]);
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

        return snapshot.docs.map(doc => ({
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

        return docs.length ? { id: docs[0].id, ...docs[0].data() } : null;    
    },

    /**
     * (Opcional) Busca un documento directamente por su ID (UUID)
     */
    findById: async (coleccion, id) => {
        const doc = await db.collection(coleccion).doc(id).get();
        // Verificamos que el documento exista Y que esté activo
        if (!doc.exists || doc.data().activo === 0) {
            return null;
        }
        return { id: doc.id, ...doc.data() };
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
        
        await docRef.set({
            ...datos,
            createdAt: new Date(),
            updatedAt: new Date(),
            activo: 1
        });
        return { id: docRef.id, ...datos };      
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
        return { id, ...updateData };
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
        return { id, ...updateData };        
    },
};

module.exports = Firestore;