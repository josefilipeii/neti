<template>
  <details>
    <button @click="handleButtonClick" :disabled="buttonDisabled" class="bg-blue-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50">
      Checkin Manual
    </button>
    <span>{{ message }}</span>
    <span>{{ error }}</span>
  </details>
</template>

<script setup lang="ts">
import { ref } from "vue";
import {functions} from "../firebase.ts";
import { httpsCallable } from 'firebase/functions';

const props = defineProps<{
  competition: string;
  heat: string;
  registration: string;
  qrId: string;
}>();

const checkinFunction = httpsCallable(functions, "handleCheckin");

const buttonDisabled = ref(false);
const message = ref('');
const error = ref('');

const handleButtonClick = async () => {
  buttonDisabled.value = true;
  setTimeout(() => {
    buttonDisabled.value = false;
  }, 60000); // Disable for 1 minute
  await handleCheckin();
};

const handleCheckin = async () => {
  try {
    await checkinFunction({
      token: props.qrId
    });
    message.value = `Checkin realizado para ${props.competition}/${props.heat}/${props.registration}`
  } catch (err) {
    error.value = `Error: ${err}`;

  }
  setTimeout(() => {
    error.value = '';
    message.value = '';
  }, 10000);
};





</script>
