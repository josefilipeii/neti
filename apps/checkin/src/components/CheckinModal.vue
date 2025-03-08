<template>
  <div class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
      <h3 class="text-lg font-medium text-gray-900">Check-in</h3>
      <p class="text-sm text-gray-900 mt-2">QR: {{ data.id }}</p>
      <div v-if="data?.type === 'registration'" class="mt-4">
        <p class="text-gray-700 font-medium">ID da Competição: {{ data.competition.name }}</p>
        <p class="text-gray-700">Dorsal: {{ props.data.registration.dorsal || 'N/A' }}</p>
        <p class="text-gray-700">Categoria: {{ data.registration?.category?.name || 'N/A' }}</p>
        <p class="text-gray-700">Data: {{ data.registration?.day }} às {{ data.registration?.time }}</p>

        <h4 class="mt-4 font-medium text-gray-900">Participantes</h4>
        <ul class="bg-gray-100 p-3 rounded-md text-gray-900">
          <li v-for="(participant, index) in data.registration.participants" :key="'participant-'+index">
            {{ participant.name }}
          </li>
        </ul>

        <button
            @click="emit('checkin')"
            v-if="!data.redeemed"
            class="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none">
          Realizar Check-In
        </button>

        <div v-if="data.redeemed" class="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg mt-4">
          Check-in efetuado: {{ data.redeemed?.at?.toDate().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' }) }} por {{ data.redeemed.how }}
        </div>

        <button
            @click="emit('close')"
            class="mt-4 w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 focus:outline-none">
          Fechar
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import type {QRRegistrationDocument} from "shared";
import {Maybe} from "../domain";

const props = defineProps<{ data: Maybe<QRRegistrationDocument>}>()



const emit = defineEmits(['checkin', 'close']);
</script>
