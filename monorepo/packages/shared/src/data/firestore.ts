import {Repository} from "../data/stores";
import { collection, getDocs} from 'firebase/firestore';
import {Category, Competition} from "../domain";






const repository: (db) => Repository = (db) => {
    return {
        competitions: async () => {
            const competitionsCollection=  collection(db, 'competitions')
            const snapshot = await getDocs(competitionsCollection);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Competition));
        },
        categories: async (competitionId: string) => {
            const categoriesCollection = collection(db, `competitions/${competitionId}/categories`);
            const snapshot = await getDocs(categoriesCollection);
            return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Category));
        }

    }

}


const useCompetitionsRepository = (db) => {
    return repository(db)
}

export {useCompetitionsRepository}