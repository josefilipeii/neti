import {defineStore} from 'pinia';
import {useCollection, useFirestore} from 'vuefire';
import {collection, CollectionReference} from 'firebase/firestore';
import type {Competition, Heat, Registration} from "shared";
import type {ComputedRef} from "vue";
import {computed, onMounted, ref, shallowRef, watch} from "vue";
import type {Maybe} from "../model";
import {useCompetitionStore} from "./competitions.ts";

export const useRegistrationsStore = defineStore('registrations', () => {
    const db = useFirestore();
    const competitionStore = useCompetitionStore();
    const selectedHeatId = shallowRef<Maybe<string>>(null);
    const selectedCompetitionId = computed(() => competitionStore.selectedCompetitionId);


    // Store heats and registrations as reactive Maps
    // @ts-ignore
    const heats = ref(new Map<string, ReturnType<typeof useCollection<Heat>>>());
    // @ts-ignore
    const registrations = ref(new Map<string, Map<string, ReturnType<typeof useCollection<Registration>>>>());

    const updateSelectedHeat = (heat: string | null) => {
        selectedHeatId.value = heat;
    }

    const selectedHeat: ComputedRef<Maybe<Heat>> = computed(() => selectedCompetitionId && selectedHeatId.value ?
        getHeatById(selectedCompetitionId.value!!, selectedHeatId.value!!) :
        null);

    const registrationsForSelection: ComputedRef<Maybe<Registration[]>> = computed(() => {
        return getRegistrationsByHeatId(selectedCompetitionId.value!!, selectedHeatId.value!!)
    });

    const heatsForSelection: ComputedRef<Maybe<Heat[]>> = computed(() => selectedCompetitionId.value ?
        getHeatsByCompetitionId(selectedCompetitionId.value!!)
        : null);


    const heatsSrc = (competition: string) => (collection(db, `competitions/${competition}/heats`))
    const registrationsSrc = (competition: string, heat: string) => (collection(db, `competitions/${competition}/heats/${heat}/registrations`))

    onMounted(() => {
        if (selectedCompetitionId.value) {
            heats.value.set(selectedCompetitionId.value, useCollection<Heat>(heatsSrc(selectedCompetitionId.value) as CollectionReference<Heat>));
        }
    })


    watch(selectedCompetitionId, async (competitionId) => {
        if (competitionId) {
            if (!heats.value.has(competitionId)) {
                heats.value.set(competitionId, useCollection<Heat>(heatsSrc(competitionId) as CollectionReference<Heat>));
            }
        }
    });

    watch(selectedHeatId, async (heatId) => {

        const competitionId = selectedCompetitionId.value;

        if (competitionId && heatId) {
            if (!heats.value.get(competitionId)?.value?.length) {
                console.warn(`Heats for competition ${competitionId} not loaded yet.`);
                return null;
            }
            if (!registrations.value.has(competitionId)) {
                registrations.value.set(competitionId, new Map());
            }
            if (!registrations.value.get(competitionId)?.has(heatId)) {
                registrations.value.get(competitionId)?.set(heatId,
                    useCollection<Registration>(registrationsSrc(competitionId, heatId) as CollectionReference<Registration>));
            }
        }

    });

    // VueFire's useCollection automatically syncs with Firestore inside setup()
    const competitions = useCollection<Competition>(
        collection(db, 'competitions') as CollectionReference<Competition>
    );


    const getCompetitionById = (competitionId: string): Competition | null => {
        return competitions.value?.find((comp) => comp.id === competitionId) || null;
    }

    const getHeatById = (competitionId: string, heatId: string): Heat | null => {
        const heatsList = heats.value.get(competitionId)?.value || [];
        return heatsList.find((heat) => heat.id === heatId) || null;
    }

    const getRegistrationById = (competitionId: string, heatId: string, registrationId: string): Registration | null => {
        const registrationsList = registrations.value.get(competitionId)?.get(heatId)?.value || [];
        return registrationsList.find((reg) => reg.id === registrationId) || null;
    }

    const getRegistrationsByHeatId = (competitionId: string, heatId: string): Registration[] => {
        return registrations.value.get(competitionId)?.get(heatId)?.value || [];
    }

    const getHeatsByCompetitionId = (competitionId: string): Heat[] => {
        return heats.value.get(competitionId)?.value || [];
    }


    return {
        selectedCompetitionId,
        selectedHeatId,
        registrationsForSelection,
        heatsForSelection,
        selectedHeat,
        competitions,
        heats,
        registrations,
        updateSelectedHeat,
        getHeatsByCompetitionId,
        getCompetitionById,
        getHeatById,
        getRegistrationById,
        getRegistrationsByHeatId
    };
});
