import { defineStore } from 'pinia';
import { useCollection } from 'vuefire';
import { collection, getFirestore, CollectionReference } from 'firebase/firestore';
import type { Competition, Heat, Registration } from "shared";
import type { ComputedRef } from "vue";
import { computed, shallowRef, watch, ref } from "vue";
import type { Maybe } from "../model";

export const useCompetitionStore = defineStore('competitionStore', () => {
    const selectedCompetitionId = shallowRef<Maybe<string>>(null);
    const selectedHeatId = shallowRef<Maybe<string>>(null);


    // Store heats and registrations as reactive Maps
    // @ts-ignore
    const heats = ref(new Map<string, ReturnType<typeof useCollection<Heat>>>());
    // @ts-ignore
    const registrations = ref(new Map<string, Map<string, ReturnType<typeof useCollection<Registration>>>>());

    const updateSelectedCompetition = async (competition: string) => {
        selectedCompetitionId.value = competition;
    }
    const updateSelectedHeat = (heat: string | null) => {
        selectedHeatId.value = heat;
    }

    const selectedHeat: ComputedRef<Maybe<Heat>> = computed(() => selectedCompetitionId.value && selectedHeatId.value ?
        getHeatById(selectedCompetitionId.value!!, selectedHeatId.value!!) :
        null);

    const registrationsForSelection: ComputedRef<Maybe<Registration[]>> = computed(() => selectedCompetitionId.value && selectedHeat.value ?
        getRegistrationsByHeatId(selectedCompetitionId.value!!, selectedHeatId.value!!) :
        []);

    const heatsForSelection: ComputedRef<Maybe<Heat[]>> = computed(() => selectedCompetitionId.value ? getHeatsByCompetitionId(selectedCompetitionId.value!!) : null);

    watch(selectedCompetitionId, async (competitionId) => {
        if (competitionId) {
            if (!heats.value.has(competitionId)) {
                heats.value.set(competitionId, useCollection<Heat>(
                    collection(getFirestore(), `competitions/${competitionId}/heats`) as CollectionReference<Heat>
                ));
            }
        }
    });

    watch(selectedHeatId, async () => {
        if (selectedCompetitionId.value && selectedHeatId.value) {
            const competitionId = selectedCompetitionId.value;
            const heatId = selectedHeatId.value;
            if (!heats.value.get(competitionId)?.value?.length) {
                console.warn(`Heats for competition ${competitionId} not loaded yet.`);
                return null;
            }

            if (!registrations.value.has(competitionId)) {
                registrations.value.set(competitionId, new Map());
            }
            if (!registrations.value.get(competitionId)?.has(heatId)) {
                registrations.value.get(competitionId)?.set(heatId, useCollection<Registration>(
                    collection(getFirestore(), `competitions/${competitionId}/heats/${heatId}/registrations`) as CollectionReference<Registration>
                ));
            }

        }
    });

    // VueFire's useCollection automatically syncs with Firestore inside setup()
    const competitions = useCollection<Competition>(
        collection(getFirestore(), 'competitions') as CollectionReference<Competition>
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
        updateSelectedCompetition,
        updateSelectedHeat,
        getHeatsByCompetitionId,
        getCompetitionById,
        getHeatById,
        getRegistrationById,
        getRegistrationsByHeatId
    };
});
