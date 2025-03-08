<template>
  <details>
    <summary>{{ displayedCheckin ? 'Sim' : 'Não' }}</summary>
    <div v-if="displayedCheckin?.at">
      <p><strong>Check-in Time:</strong> {{ displayedCheckin?.at?.toDate().toLocaleString() }}</p>
      <p><strong>Checked in by:</strong> {{ displayedCheckin?.by }}</p>
      <p><strong>Check-in Method:</strong> {{ displayedCheckin?.how }}</p>
    </div>
    <button @click="handleButtonClick" :disabled="buttonDisabled || loading || displayedCheckin?.at !== undefined" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50">
      {{ loading ? 'Loading...' : 'Refresh' }}
    </button>
  </details>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import type { Redemption } from "shared";

const props = defineProps<{
  checkin?: Redemption; // Received from `registrations` collection
  competition: string;
  heat: string;
  registration: string;
}>();

const db = getFirestore();
const checkin = ref<Redemption | null>(null);
const loading = ref(false);

// Show the latest check-in: either from `registrations` (prop) or fetched manually
const displayedCheckin = computed(() => checkin.value || props.checkin);

const buttonDisabled = ref(false);

const handleButtonClick = async () => {
  buttonDisabled.value = true;
  setTimeout(() => {
    buttonDisabled.value = false;
  }, 60000); // Disable for 1 minute
  await fetchLatestCheckin();
};

const fetchLatestCheckin = async () => {
  loading.value = true;
  try {
    const checkinRef = doc(db, `/competitions/${props.competition}/heats/${props.heat}/checkins/${props.registration}`);
    const snapshot = await getDoc(checkinRef);
    console.log("Fetched check-in:", snapshot.data());
    if (snapshot.exists()) {
      checkin.value = snapshot.data() as Redemption;
      console.log("Updated check-in:", checkin.value);
    } else {
      console.log("No check-in found in checkins collection.");
    }
  } catch (error) {
    console.error("Error fetching check-in:", error);
  }
  loading.value = false;
};
</script>
