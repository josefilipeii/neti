import {defineStore} from 'pinia';
import {useCollection, useFirestore} from 'vuefire';
import {collection, CollectionReference} from 'firebase/firestore';
import type {Competition} from "shared";
import {shallowRef,} from "vue";
import type {Maybe} from "../model";

export const useCompetitionStore = defineStore('competitionStore', () => {
    const db = useFirestore();
    const selectedCompetitionId = shallowRef<Maybe<string>>(null);

    const updateSelectedCompetition = async (competition: string) => {
        selectedCompetitionId.value = competition;
    }


    // VueFire's useCollection automatically syncs with Firestore inside setup()
    const competitions = useCollection<Competition>(
        collection(db, 'competitions') as CollectionReference<Competition>
    );


    const getCompetitionById = (competitionId: string): Competition | null => {
        return competitions.value?.find((comp) => comp.id === competitionId) || null;
    }

    return {
        selectedCompetitionId,
        competitions,
        updateSelectedCompetition,
        getCompetitionById
    };
});
