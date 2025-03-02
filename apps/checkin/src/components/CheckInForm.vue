<script setup lang="ts">
import {ref} from 'vue';
import QRScanner from './QRScanner.vue';
import {Participant, Registration} from 'shared';
import {participantsById, registrationByQr} from "../data/qr-repository";


type RegistrationWithCompetition = Registration & { competitionId: string };

const participants = ref<Participant[]>([]);
const registration = ref<RegistrationWithCompetition | null>(null);


const loading = ref(false);
const error = ref('');
const email = ref('');
const isValidEmail = ref(false);
const readData = ref('N/A');


const handleQRScanned = async (code: string) => {
  readData.value = code;
  loading.value = true;
  error.value = '';

  try {
    const data = await registrationByQr(code);
    console.log(data);
    const participantsData = await participantsById(data.competitionId, data.participants);
    console.log(participantsData)
    if (!data && !participantsData) {
      error.value = 'Participant not found';
      return;
    }

    registration.value = data;
    participants.value = participantsData;


  } catch (err) {
    console.error('Error fetching participant:', err);
    error.value = 'Error fetching participant data';
  } finally {
    loading.value = false;
  }
};


const handleSubmit = async () => {
  loading.value = true;
  error.value = '';

  try {
    alert("Checkin go here")
  } catch (err) {
    console.error('Error checking in participant:', err);
    error.value = 'Error checking in participant';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div>
    <QRScanner @code-scanned="handleQRScanned"/>
    <h3 class="font-medium text-gray-900">Dorsal Lido: {{ readData }}</h3>


    <div class="bg-white rounded-lg shadow-md p-6 mt-6">
      <h2 class="text-2xl font-semibold mb-6">Participant Check-in</h2>

      <div v-if="error" class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
        {{ error }}
      </div>


      <p class="text-gray-600">Dorsal: {{ registration?.dorsal }}</p>
      <p class="text-gray-600">Category: {{ registration?.category }}</p>
      <div v-for="participant in participants" :key="participant.id" class="mb-6 p-4 bg-gray-50 rounded-md">
        <h3 class="font-medium text-gray-900">Participant Details</h3>
        <p class="mt-2 text-gray-600">Name: {{ participant.name }}</p>
        <p class="text-gray-600">Email: {{ participant.email }}</p>
        <p class="text-gray-600">Contact: {{ participant.contact }}</p>
        <button @click="handleSubmit" :disabled="loading"
                class="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
          <span v-if="loading">Checking in...</span>
          <span v-else>Check In</span>
        </button>
      </div>

      <button
          @click="handleSubmit"
          :disabled="!participants || loading"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="loading">Checking in...</span>
        <span v-else>Check In</span>
      </button>
    </div>
  </div>
</template>
