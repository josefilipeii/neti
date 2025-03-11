import {defineStore} from "pinia";
import {computed, ref, shallowRef, watch} from "vue";
import type {QRDocument, QRRegistrationDocument} from "shared";
import {useDocument, useFirestore} from "vuefire";
import {collection, doc} from 'firebase/firestore';

export const useQrStore = defineStore("qr", () => {
    const db = useFirestore();
    const selectedQrId = ref<string | null>(null);


    // @ts-ignore
    const cache = shallowRef(new Map<string, ReturnType<typeof useDocument<QRDocument>>>()); // Store cached QR data

    const selectedQrData = computed(() => {
        if (selectedQrId.value && cache.value.has(selectedQrId.value)) {
            return cache.value.get(selectedQrId.value)?.value; // Return cached data
        }
        return null;

    });

    const selectedRegistration = computed(() => {
        if (selectedQrData.value && selectedQrData.value.type === "registration") {
            return selectedQrData.value as QRRegistrationDocument;
        }
        return null;
    })


    // Watch Firestore updates and store in cache
    watch(selectedQrId, async (newVal) => {
        if (newVal && !cache.value.has(newVal)) {
            const document = useDocument<QRDocument>(doc(collection(db, 'qrCodes'), newVal));
            cache.value.set(newVal, document)
        }
    });


    const setSelectedQrId = (id: string | null) => {
        selectedQrId.value = id;
    };

    return {
        selectedQrId,
        selectedQrData, // Use cached data if available
        setSelectedQrId,
        selectedRegistration
    };
});
