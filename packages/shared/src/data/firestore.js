"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCompetitionsRepository = void 0;
const firestore_1 = require("firebase/firestore");
const repository = (db) => {
    return {
        competitions: async () => {
            const competitionsCollection = (0, firestore_1.collection)(db, 'competitions');
            const snapshot = await (0, firestore_1.getDocs)(competitionsCollection);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
        categories: async (competitionId) => {
            const categoriesCollection = (0, firestore_1.collection)(db, `competitions/${competitionId}/categories`);
            const snapshot = await (0, firestore_1.getDocs)(categoriesCollection);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
    };
};
const useCompetitionsRepository = (db) => {
    return repository(db);
};
exports.useCompetitionsRepository = useCompetitionsRepository;
