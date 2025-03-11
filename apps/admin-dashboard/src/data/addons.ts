import {defineStore} from 'pinia';
import {useCollection, useFirestore} from 'vuefire';
import {collection, CollectionReference} from 'firebase/firestore';
import type {TshirtAddon} from "shared";
import {computed, onMounted, ref, watch} from "vue";
import {useCompetitionStore} from "../data/competitions.ts";

export const useAddonsStore = defineStore('addons', () => {
    const db = useFirestore();
    const competitionStore = useCompetitionStore();
    const selectedCompetitionId = computed(() => competitionStore.selectedCompetitionId);

    // @ts-ignore
    const tshirts = ref(new Map<string, ReturnType<typeof useCollection<TshirtAddon>>>());
    const tshirtsSrc = computed(() => selectedCompetitionId.value ? collection(db, `competitions/${selectedCompetitionId.value}/addons/types/tshirts`) as CollectionReference<TshirtAddon> : null);
    const tshirtsForSelection = computed(() => selectedCompetitionId.value ? tshirts.value.get(selectedCompetitionId.value) : null);


    onMounted(() => {
        if (selectedCompetitionId.value) {
            tshirts.value.set(selectedCompetitionId.value, useCollection<TshirtAddon>(tshirtsSrc.value as CollectionReference<TshirtAddon>));
        }
    })


    watch(selectedCompetitionId, async (competitionId) => {
        if (competitionId) {
            if (!tshirts.value.has(competitionId)) {
                tshirts.value.set(competitionId, useCollection<TshirtAddon>(tshirtsSrc.value as CollectionReference<TshirtAddon>));

            }
        }
    });


    return {
        selectedCompetitionId,
        tshirts,
        tshirtsForSelection
    };
});
