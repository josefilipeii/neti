import { defineStore } from 'pinia';
import { useFirestore } from 'vuefire';
import { collection, CollectionReference, query, orderBy, limit, startAfter, onSnapshot, getDocs, updateDoc, doc, DocumentSnapshot } from 'firebase/firestore';
import type { TshirtAddon } from "shared";
import { computed, ref, watch } from "vue";
import { useCompetitionStore } from "../data/competitions.ts";
import  {Timestamp} from "firebase/firestore";

export const useAddonsStore = defineStore('addons', () => {
    const db = useFirestore();
    const competitionStore = useCompetitionStore();
    const selectedCompetitionId = computed(() => competitionStore.selectedCompetitionId);

    const tshirts = ref<Record<string, TshirtAddon[]>>({}); // Store as reactive object
    const lastVisible = ref<Record<string, DocumentSnapshot | null>>({}); // Last document per competition
    const isLoading = ref(false);
    const pageSize = 10; // Number of items per page
    let unsubscribeListener: (() => void) | null = null; // Firestore listener

    // Firestore Collection Reference
    const tshirtsSrc = computed(() =>
        selectedCompetitionId.value
            ? collection(db, `competitions/${selectedCompetitionId.value}/addons/types/tshirts`) as CollectionReference<TshirtAddon>
            : null
    );

    // Load First Page with `getDocs()`
    const loadTshirts = async () => {
        if (!selectedCompetitionId.value || !tshirtsSrc.value) return;

        isLoading.value = true;
        const q = query(tshirtsSrc.value, orderBy("createdAt"), limit(pageSize));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            tshirts.value[selectedCompetitionId.value] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            lastVisible.value[selectedCompetitionId.value] = snapshot.docs[snapshot.docs.length - 1];
        } else {
            lastVisible.value[selectedCompetitionId.value] = null;
        }

        isLoading.value = false;
        subscribeToTshirts(); // Listen only for displayed T-shirts
    };

    // Load More Data (Pagination)
    const loadMoreTshirts = async () => {
        const competitionId = selectedCompetitionId.value;
        if (!competitionId || !tshirtsSrc.value || !lastVisible.value[competitionId]) return;

        isLoading.value = true;
        const q = query(
            tshirtsSrc.value,
            orderBy("createdAt"),
            startAfter(lastVisible.value[competitionId]),
            limit(pageSize)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            tshirts.value[competitionId] = [
                ...(tshirts.value[competitionId] || []),
                ...snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            ];
            lastVisible.value[competitionId] = snapshot.docs[snapshot.docs.length - 1];
        } else {
            lastVisible.value[competitionId] = null;
        }

        isLoading.value = false;
    };

    // Subscribe to Real-Time Updates for Displayed Items
    const subscribeToTshirts = () => {
        if (!selectedCompetitionId.value || !tshirtsSrc.value) return;

        if (unsubscribeListener) unsubscribeListener(); // Remove previous listener

        // Listen only for T-shirts currently displayed
        unsubscribeListener = onSnapshot(
            query(tshirtsSrc.value, orderBy("createdAt"), limit(pageSize)),
            (snapshot) => {
                const updatedTshirts = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                tshirts.value[selectedCompetitionId.value!] = updatedTshirts; // Update only displayed items
            }
        );
    };

    // Update a T-shirt in Firestore & Locally
    const updateTshirt = async (tshirtId: string) => {
        const competitionId = selectedCompetitionId.value;
        if (!competitionId || !tshirts.value[competitionId]) return;

        const tshirtIndex = tshirts.value[competitionId].findIndex(tshirt => tshirt.id === tshirtId);
        if (tshirtIndex !== -1) {
            // Update Firestore Document
            const tshirtRef = doc(db, `competitions/${competitionId}/addons/types/tshirts`, tshirtId);
            await updateDoc(tshirtRef, { redeemed: { at: new Date().toISOString() } });

            // Update Local State
            tshirts.value[competitionId][tshirtIndex] = {
                ...tshirts.value[competitionId][tshirtIndex],
                redeemed: { at: Timestamp.now(), by: "admin", how: "manual"}
            };
        }
    };

    // Watch for competition ID changes
    watch(selectedCompetitionId, async (competitionId) => {
        if (competitionId) {
            tshirts.value[competitionId] = [];
            lastVisible.value[competitionId] = null;
            await loadTshirts();
        }
    }, { immediate: true });

    return {
        selectedCompetitionId,
        tshirts,
        lastVisible,
        loadTshirts,
        loadMoreTshirts,
        updateTshirt,
        isLoading
    };
});
