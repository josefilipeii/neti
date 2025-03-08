import { defineStore } from 'pinia';
import { useCollection } from 'vuefire';
import { collection, getFirestore, CollectionReference } from 'firebase/firestore';
import type { Competition, Heat, Registration } from "shared";


export const useCompetitionStore = defineStore('competitionStore', () => {
    // VueFire's useCollection automatically syncs with Firestore inside setup()
    const competitions = useCollection<Competition>(
        collection(getFirestore(), 'competitions') as CollectionReference<Competition>
    );

    // Store heats and registrations as reactive dictionaries
    // @ts-ignore
    const heats = {} as Record<string, ReturnType<typeof useCollection<Heat>>>;
    // @ts-ignore
    const registrations = {} as Record<string, Record<string, ReturnType<typeof useCollection<Registration>>>>;

    /**
     * Fetch heats for a competition (caches in state)
     */
    const fetchHeats = (competitionId: string) => {
        if (!heats[competitionId]) {
            heats[competitionId] = useCollection<Heat>(
                collection(getFirestore(), `competitions/${competitionId}/heats`) as CollectionReference<Heat>
            );
        }
        return heats[competitionId];
    }

    /**
     * Fetch registrations for a heat (ensures heats exist first)
     */
    const fetchRegistrations = (competitionId: string, heatId: string)  => {
        if (!heats[competitionId]?.value?.length) {
            console.warn(`Heats for competition ${competitionId} not loaded yet.`);
            return null;
        }

        if (!registrations[competitionId]) {
            registrations[competitionId] = {};
        }

        if (!registrations[competitionId][heatId]) {
            registrations[competitionId][heatId] = useCollection<Registration>(
                collection(getFirestore(), `competitions/${competitionId}/heats/${heatId}/registrations`) as CollectionReference<Registration>
            );
        }

        return registrations[competitionId][heatId];
    }

    /**
     * Get a specific competition by ID
     */
    const getCompetitionById = (competitionId: string): Competition | null => {
        return competitions.value?.find((comp) => comp.id === competitionId) || null;
    }

    /**
     * Get a specific heat by ID (ensures heats are loaded first)
     */
    const getHeatById = (competitionId: string, heatId: string): Heat | null =>  {
        const heatsList = heats[competitionId]?.value || [];
        return heatsList.find((heat) => heat.id === heatId) || null;
    }

    /**
     * Get a specific registration by ID (ensures registrations are loaded first)
     */
    const  getRegistrationById = (competitionId: string, heatId: string, registrationId: string): Registration | null =>{
        const registrationsList = registrations[competitionId]?.[heatId]?.value || [];
        return registrationsList.find((reg) => reg.id === registrationId) || null;
    }

    const getRegistrationsByHeatId = (competitionId: string, heatId: string): Registration[] => {
        return registrations[competitionId]?.[heatId]?.value || [];
    }

    const getHeatsByCompetitionId= (competitionId: string): Heat[] => {
        return heats[competitionId]?.value || [];
    }

    return {
        competitions,
        heats,
        registrations,
        fetchHeats,
        fetchRegistrations,
        getHeatsByCompetitionId,
        getCompetitionById,
        getHeatById,
        getRegistrationById,
        getRegistrationsByHeatId
    };
});
