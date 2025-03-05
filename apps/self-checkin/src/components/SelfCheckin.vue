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
            :disabled="checkinDone"
            placeholder="Introduza o seu email"
            class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span v-if="inputError" class="text-red-500 text-sm">{{ inputError }}</span>
        <button
            type="submit"
            class="w-full bg-blue-500 text-white py-2 rounded-lg mt-4 hover:bg-blue-600 transition"
        >
          Validar
        </button>
      </form>
      <div class="mt-6"></div>
      <!-- Success Toast -->
      <div v-if="successToast" class="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
        {{ successToast }}
      </div>

      <!-- Error Toast -->
      <div v-if="errorToast" class="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
        {{ errorToast }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeMount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { httpsCallable } from 'firebase/functions';
import bannerImage from '../assets/banner.png';
import { functions } from '../firebase.ts';

const route = useRoute();
const inputError = ref('');
const email = ref('');
const paramToken = ref('');
const checkinDone = ref(false);
const bannerUrl = ref(bannerImage);
const successToast = ref('');
const errorToast = ref('');
const checkinFunction = httpsCallable(functions, "handleSelfCheckin");
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validEmail = computed(() => emailRegex.test(email.value));

const clearToasts = () => {
  successToast.value = '';
  errorToast.value = '';
};

onBeforeMount(() => {
  if (route.query.q) {
    paramToken.value = route.query.q as string;
  }
});

watch(
    () => route.query.q,
    (newValue) => {
      clearToasts();
      paramToken.value = newValue as string;
    }
);

const validateForm = () => {
  clearToasts();
  if (!paramToken.value) {
    inputError.value = "Token inválido";
    return;
  }
  if (!email.value) {
    inputError.value = 'Por favor, introduza o seu email.';
    return;
  } else if (!validEmail.value) {
    inputError.value = 'Por favor, introduza um email válido.';
    return;
  }
  inputError.value = '';
  submitCheckin();
};

const submitCheckin = async () => {
  try {
    await checkinFunction({ token: paramToken.value, email: email.value });
    successToast.value = "Check-in efetuado com sucesso! Bem-vindo ao evento!";
    checkinDone.value = true;
    setTimeout(clearToasts, 3000);
  } catch (err) {
    console.error(err);
    errorToast.value = "Não foi possível realizar o check-in.";
    setTimeout(clearToasts, 3000);
  }
};
</script>
