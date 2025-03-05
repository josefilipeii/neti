<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
    <img :src="bannerUrl" alt="Banner do Evento" class="w-full max-w-md rounded-lg shadow-lg mb-4">

    <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
      <h2 class="text-xl font-semibold text-center mb-4">Check-in Automático</h2>
      <p class="text-sm text-gray-600 text-center mb-4">Introduza o email para check-in</p>

      <form @submit.prevent="validateForm">
        <input
            v-model="email"
            type="email"
            placeholder="Introduza o seu email"
            class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span v-if="inputError" class="text-red-500 text-sm">{{ inputError }}</span>
        <span v-if="qrError" class="text-red-500 text-sm">Erro a descarregar token</span>
        <button
            v-if="!qrDocument"
            type="submit"
            class="w-full bg-blue-500 text-white py-2 rounded-lg mt-4 hover:bg-blue-600 transition"
        >
          Validar
        </button>
      </form>
      <div v-if="qrDocument && qrDocument.redeemed" class="text-green-500 text-sm mt-4">
        Check-in realizado em {{ qrDocument.redeemed.at.toLocaleString() }} via
        {{ qrDocument.redeemed.how === 'self' ? 'Checkin Automático' : 'Checkin Manual' }}
      </div>
      <div v-if="qrDocument" class="mt-4">
        <p><strong>Competição:</strong> {{ qrDocument.competition }}</p>
        <p><strong>Heat:</strong> {{ qrDocument.heat }}</p>
        <p><strong>Dorsal:</strong> {{ qrDocument.dorsal }}</p>
        <p><strong>Categoria:</strong> {{ qrDocument.category }}</p>
        <p v-if="qrDocument.day && qrDocument.time"><strong>Data:</strong> {{ qrDocument.day }} pelas {{ qrDocument.time }}</p>
        <p><strong>Participantes:</strong></p>
        <ul class="list-disc pl-5">
          <li v-for="(participant, $index) in qrDocument.participants" :key="'participant'+$index">
            {{ participant }}
          </li>
        </ul>
      </div>
      <button
          v-if="qrDocument && !qrDocument.redeemed"
          @click="submitCheckin"
          class="w-full bg-blue-500 text-white py-2 rounded-lg mt-4 hover:bg-blue-600 transition"
      >
        Check-in
      </button>
      <button
          v-if="fetchData.token"
          @click="logout"
          class="w-full bg-red-500 text-white py-2 rounded-lg mt-4 hover:bg-red-600 transition"
      >
        Limpar
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, onBeforeMount, reactive, ref, watch} from 'vue';
import {useRoute} from 'vue-router';
import {useCollection, useFirestore} from 'vuefire';
import {httpsCallable} from 'firebase/functions';
import bannerImage from '../assets/banner.png';
import {functions} from '../firebase.ts';
import {collection, query, where} from 'firebase/firestore'
import type {QRDocument} from "shared";


const route = useRoute();
const fetchData = reactive<{ token: string, email: string }>({token: '', email: ''});
const inputError = ref('');
const message = ref('');
const error = ref('');
const email = ref('');
const bannerUrl = ref(bannerImage);
const db = useFirestore();


const checkinFunction = httpsCallable(functions, "handleCheckin");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validEmail = computed(() => {
  return emailRegex.test(email.value);
});

const qrSource = computed(() =>
    fetchData.token && fetchData.email ? query(
        collection(db, 'qrCodes'),
        where('self', '==', fetchData.token),
        where('redeemableBy', 'array-contains', fetchData.email)
    ) : null);

const {data: qrData, error: qrError} = useCollection(qrSource, {
  once: true, reset: true
})


const qrDocument = computed(() =>
    qrData && qrData.value.length > 0 ? qrData.value[0] as QRDocument : null
);


const clearData = () => {
  fetchData.token = '';
  fetchData.email = '';
  message.value = '';
  error.value = '';
};

onBeforeMount(async () => {
  if (route.query.q) {
    fetchData.token = route.query.q as string;
  }
  await logout();
});

watch(
    () => route.query.q,
    async (newValue) => {

      clearData();
      fetchData.token = newValue as string;
    }
);

const validateForm = () => {
  if (!fetchData.token) {
    inputError.value = "Token inválido";
    return;
  }
  if (!email) {
    inputError.value = 'Por favor, introduza o seu email.';
    return;
  } else if (!validEmail.value) {
    inputError.value = 'Por favor, introduza um email válido.';
  } else {
    inputError.value = '';
    fetchData.email = email.value;
  }
};

const submitCheckin = async () => {
  try {
    await checkinFunction({
      token: fetchData.token,
      email: fetchData.email
    });
    reload();
  } catch (err) {
    console.error(err);
    error.value = `Erro durante o checkin`;
  }
};

const reload = () => {
  const actualToken = fetchData.token;
  fetchData.token = '';
  fetchData.token = actualToken;
}

const logout = async () => {
  clearData();
};
</script>