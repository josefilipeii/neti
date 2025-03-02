import { collection, getDocs } from 'firebase/firestore';
const repository = (db) => {
    return {
        competitions: async () => {
            const competitionsCollection = collection(db, 'competitions');
            const snapshot = await getDocs(competitionsCollection);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
        categories: async (competitionId) => {
            const categoriesCollection = collection(db, `competitions/${competitionId}/categories`);
            const snapshot = await getDocs(categoriesCollection);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
    };
};
export const useCompetitionsRepository = (db) => (repository(db));
//# sourceMappingURL=firestore.js.map