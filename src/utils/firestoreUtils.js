const { db } = require('../../config/firebase');

const Firestore = {
    /**
     * Busca un único documento en una colección por campo/valor
     */
    findOne: async (coleccion, campo, valor) => {        
        const { docs } = await db.collection(coleccion)
            .where(campo, '==', valor)
            .limit(1)
            .get();

        return docs.length ? { id: docs[0].id, ...docs[0].data() } : null;    
    },

    /**
     * (Opcional) Busca un documento directamente por su ID (UUID)
     */
    findById: async (coleccion, id) => {
        const doc = await db.collection(coleccion).doc(id).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    }
};

module.exports = Firestore;