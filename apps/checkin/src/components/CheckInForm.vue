<script setup lang="ts">
import {computed, reactive, ref} from 'vue';
import QRScanner from './QRScanner.vue';
import { useDocument, useFirestore } from "vuefire";
import { collection, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from "../firebase";
import {QRRegistrationDocument} from "shared";


const checkinFunction = httpsCallable(functions, "handleCheckin");

const db = useFirestore();

const loading = ref(false);
const error = ref('');
const message = ref('');
const email = ref('');
const paramData = reactive<{ token: string }>({ token: '' });


const qrSource = computed(() =>
    paramData.token ? doc(collection(db, 'qrCodes'), paramData.token)
        : null
);

const {data: qrData, error: qrError} = useDocument(qrSource, {
  once: true
});

const data = computed(() => {
  return qrData.value as QRRegistrationDocument;
});

const changeTokenValue = (code: string | null) => {
  paramData.token = '';
  paramData.token = code;
};

const reload = () => {
  const actualToken = paramData.token;
  paramData.token = '';
  paramData.token = actualToken;
};

const handleCheckin = async () => {
  try {
    await checkinFunction({
      token: paramData.token
    });
    message.value = "Checkin Done for " + qrData?.value.dorsal;
    reload();
  } catch (error) {
    error.value = `Error: ${error.message}`;
  }
};

const clearContext = () => {
  paramData.token = '';
  message.value = '';
  error.value = '';
};
</script>

<template>
  <div>
    <QRScanner @code-scanned="changeTokenValue" />
    <div v-if="error || qrError" class="bg-gray-50 rounded-lg shadow-md p-6 mt-6">
      <div v-if="error" class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
        {{ error }}
      </div>
      <div v-if="qrError" class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
        {{ qrError }}
      </div>
    </div>
    <div v-if="message" class="bg-gray-50 rounded-lg shadow-md p-6 mt-6">
      <div class="mb-4 p-4 bg-green-50 text-green-700 rounded-md">
        {{ message }}
      </div>
    </div>
    <div v-if="paramData.token" class="bg-gray-50 rounded-lg shadow-md p-6 mt-6">
      <h3 class="font-medium text-gray-900">QR: {{ paramData.token }}</h3>
      <div v-if="data && data.type === 'registration'" class="mb-6 p-4 rounded-md">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div class="block sm:inline-block">
            <span class="font-medium text-gray-700">Competition ID: {{ data.competition.name }}</span>
          </div>
          <div class="block sm:inline-block">
            <span class="font-medium text-gray-700">Dorsal: {{ data.registration.dorsal || 'N/A' }}</span>
          </div>
          <div class="block sm:inline-block">
            <span class="font-medium text-gray-700">Heat: {{ data.registration?.heat?.name || 'N/A' }}</span>
          </div>
          <div class="block sm:inline-block">
            <span class="font-medium text-gray-700">Category: {{ data.registration?.category?.name || 'N/A' }}</span>
          </div>
          <div class="block sm:inline-block">
            <span class="font-medium text-gray-700">Date: {{ data.registration?.heat?.day}} at {{ data.registration?.heat?.time }}</span>
          </div>
        </div>
          <div class="mt-6"></div>
          <button
              @click="handleCheckin"
              :disabled="qrData.redeemed || loading"
              class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <span v-if="loading">Checking in...</span>
            <span v-else>Check In</span>
          </button>
          <button
              v-if="data"
              @click="clearContext"
              class="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 mt-4">
            Clear Context
          </button>
        </div>
      </div>
    </div>
  </div>
</template>