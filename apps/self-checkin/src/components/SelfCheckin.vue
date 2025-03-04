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
            v-if="!qrData"
            type="submit"
            class="w-full bg-blue-500 text-white py-2 rounded-lg mt-4 hover:bg-blue-600 transition"
        >
          Validar
        </button>
      </form>
      <div v-if="qrData && qrData.redeemed" class="text-green-500 text-sm mt-4">
        Check-in realizado em {{ qrData.redeemed.at.toDate().toLocaleString() }} via {{ qrData.redeemed === 'self' ? 'Checkin Automático' : 'Checkin Manual' }}
      </div>
      <div v-if="qrData" class="mt-4">
        <p><strong>Competição:</strong> {{ qrData.competition }}</p>
        <p><strong>Heat:</strong> {{ qrData.heat }}</p>
        <p><strong>Dorsal:</strong> {{ qrData.dorsal }}</p>
        <p><strong>Categoria:</strong> {{ qrData.category }}</p>
        <p v-if="qrData.day && qrData.time"><strong>Data:</strong> {{ qrData.day }} pelas {{qrData.time}}</p>
        <p><strong>Participantes:</strong></p>
        <ul class="list-disc pl-5">
          <li v-for="participant in qrData.participants" :key="participant.name">
            {{ participant.name }}
          </li>
        </ul>
      </div>
      <button
          v-if="qrData && !qrData.redeemed"
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
        Sair
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, onBeforeMount, reactive, ref, watch} from 'vue';
import {useRoute} from 'vue-router';
import {signInWithCustomToken, signOut} from 'firebase/auth';
import {useDocument, useFirebaseAuth, useFirestore} from 'vuefire';
import {httpsCallable} from 'firebase/functions';
import bannerImage from '../assets/banner.png';
import {functions} from '../firebase.ts';
import {collection, doc} from 'firebase/firestore'

const auth = useFirebaseAuth();
const route = useRoute();
const email = ref('');
const paramToken = ref('');
const fetchData = reactive<{token: string}>({token: ''});
const inputError = ref('');
const message = ref('');
const error = ref('');
const bannerUrl = ref(bannerImage);
const db = useFirestore();

interface CustomAuthenticationResponse {
  token: string;
}

interface CustomAuthenticationRequest {
  token: string;
  email: string;
}

const fetchSigningToken = httpsCallable<CustomAuthenticationRequest, CustomAuthenticationResponse>(functions, 'handleSigningToken');
const checkinFunction = httpsCallable(functions, "handleCheckin");

const qrSource = computed(() =>
    fetchData.token ? doc(collection(db, 'qrCodes'), fetchData.token)
        : null
);

const {data: qrData, error: qrError} = useDocument(qrSource, {
  once: true, reset: true
})


const clearEmail = () => {
  email.value = '';
};

const clearData = () => {
  fetchData.token = '';
  message.value = '';
  error.value = '';
};

onBeforeMount(async () => {
  if (route.query.q) {
    paramToken.value = route.query.q as string;
  }
  await logout();
});

watch(
    () => route.query.q,
    async (newValue) => {
      clearEmail();
      clearData();
      await logout();
      paramToken.value = newValue as string;
    }
);

const validateForm = () => {
  if (!paramToken.value) {
    inputError.value = "Token inválido";
    return;
  }
  if (!email.value) {
    inputError.value = 'Por favor, introduza o seu email.';
  } else {
    inputError.value = '';
    validate();
  }
};

const validate = async () => {
  try {
    const response = await fetchSigningToken({
      token: paramToken.value,
      email: email.value
    });
    if (auth && response.data && response.data.token) {
      await signInWithCustomToken(auth, response.data.token);
      fetchData.token = paramToken.value;
    } else {
      throw new Error('Resposta de token inválida');
    }
  } catch (error) {
    console.error('Falha no login:', error);
    inputError.value = 'Token Inválido';
  }
};

const submitCheckin = async () => {
  try {
    await checkinFunction({
      token: fetchData.token
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
  clearEmail()
  await signOut(auth!!);
};
</script>