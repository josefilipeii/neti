<script setup lang="ts">
import {computed, reactive, ref, warn, watch} from 'vue';
import QRScanner from './QRScanner.vue';
import {useDocument, useFirestore} from "vuefire";
import {collection, doc} from 'firebase/firestore'
import {httpsCallable} from 'firebase/functions'
import {functions} from "../firebase";


const checkinFunction = httpsCallable(functions, "handleCheckin");

const db = useFirestore();

const loading = ref(false);
const error = ref('');
const message = ref('');
const email = ref('');
const data = reactive<{token: string}>({token: ''});


const qrSource = computed(() =>
    data.token ? doc(collection(db, 'qrCodes'), data.token)
        : null
);

const {data: qrData, error: qrError} = useDocument(qrSource, {
  once: true
})


const changeTokenValue = (code: string | null) => {
  data.token = ''
  data.token = code;
};

const reload = () => {
  const actualToken = data.token;
  data.token = '';
  data.token = actualToken;
}




const handleCheckin = async () => {
  try {
    await checkinFunction({
      token: data.token
    });
    message.value = "Checkin Done for " + qrData?.value.dorsal;
    reload();
  } catch (error) {
    error.value = `Error: ${error.message}`;
  }
};


const clearContext = () => {
  data.token = '';
  message.value = '';
  error.value = '';
};
</script>

<template>
  <div>
    <QRScanner @code-scanned="changeTokenValue"/>
    <div v-if="error || qrError" class=" bg-gray-50 rounded-lg shadow-md p-6 mt-6">
      <div v-if="error" class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
        {{ error }}
      </div>
      <div v-if="qrError" class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
        {{ qrError }}
      </div>
    </div>
    <div v-if="message" class=" bg-gray-50 rounded-lg shadow-md p-6 mt-6">
      <div  class="mb-4 p-4 bg-green-50 text-green-700 rounded-md">
        {{ message}}
      </div>
    </div>
    <div v-if="data.token" class=" bg-gray-50 rounded-lg shadow-md p-6 mt-6">
      <h3 class="font-medium text-gray-900">QR: {{ data.token }}</h3>
      <div v-if="qrData && qrData.type === 'registration'" class="mb-6 p-4 rounded-md">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div class="block sm:inline-block">
            <span class="font-medium text-gray-700">Dorsal: {{ qrData.dorsal || 'N/A' }}</span>
          </div>
          <div class="block sm:inline-block">
            <span class="font-medium text-gray-700">Heat: {{ qrData.heat || 'N/A' }}</span>
          </div>
          <div class="block sm:inline-block">
            <span class="font-medium text-gray-700">Category: {{ qrData.category || 'N/A' }}</span>
          </div>
          <div class="block sm:inline-block">
            <span class="font-medium text-gray-700">Competition ID: {{ qrData.competition }}</span>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full mt-4 table-auto">
            <thead class="bg-gray-50">
            <tr>
              <th class="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th class="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th class="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
            </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="(participant, $index) in qrData.participants" :key="'participant-'+$index">
              <td class="px-4 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">{{ participant.name }}</td>
              <td class="px-4 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">{{ participant.email }}</td>
              <td class="px-4 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">{{ participant.contact }}</td>
            </tr>
            </tbody>
          </table>
          <div class="mt-6"></div>
          <button
              v-if="!qrData.redeemed"
              @click="handleCheckin"
              :disabled="!qrData.participants || qrData.redeemed || loading"
              class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
             disabled:opacity-50 disabled:cursor-not-allowed">
            <span v-if="loading">Checking in...</span>
            <span v-else>Check In</span>
          </button>
          <button
              v-if="qrData"
              @click="clearContext"
              class="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 mt-4">
            Clear Context
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
