<template>
  <div class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
      <h3 class="text-lg font-medium text-gray-900">Leitura</h3>
      <p class="text-sm text-gray-900 mt-2">QR: {{ data.id }}</p>
      <div v-if="tshirt" class="mt-4">
        <h2 class="text-lg font-medium text-gray-900">Tshirt</h2>
        <p class="text-gray-700 font-medium">Nome do Comprador: {{ tshirt.name }}</p>
        <h4 class="mt-4 font-medium text-gray-900">Tamanhos</h4>
        <ul class="bg-gray-100 p-3 rounded-md text-gray-900">
          <li v-for="([size, quantity]) in Object.entries(tshirt.sizes).filter(([,v]) => v)" :key="size">
            {{ size.toUpperCase() }} : {{ quantity }}
          </li>
        </ul>
        <button
            :disabled="!props.inAction"
            @click="emit('redeem:tshirt')"
            v-if="!data.redeemed"
            class="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none">
          Levantar Tshirt
        </button>

        <div v-if="data.redeemed" class="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg mt-4">
          Levantamento efetuado: {{ data.redeemed?.at?.toDate().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' }) }} por {{ data.redeemed.how }}
        </div>

        <button
            @click="emit('close')"
            class="mt-4 w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 focus:outline-none">
          Fechar
        </button>
      </div>
      <div v-else-if="registration" class="mt-4">
        <h2 class="text-lg font-medium text-gray-900">Checkin</h2>
        <p class="text-gray-700 font-medium">ID da Competição: {{ registration.competition }}</p>
        <p class="text-gray-700">Dorsal: {{ registration.registration.dorsal || 'N/A' }}</p>
        <p class="text-gray-700">Categoria: {{ registration.registration.category || 'N/A' }}</p>
        <p class="text-gray-700">Data: {{ registration.registration.day }} às {{ registration.registration?.time }}</p>

        <h4 class="mt-4 font-medium text-gray-900">Participantes</h4>
        <ul class="bg-gray-100 p-3 rounded-md text-gray-900">
          <li v-for="(participant, index) in registration.registration.participants" :key="'participant-'+index">
            {{ participant.name }}
          </li>
        </ul>

        <button
            :disabled="!props.inAction"
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
import {defineProps, defineEmits, computed} from 'vue';
import type {QRAddonDocument, QRDocument, QRRegistrationDocument, QRTShirtDocument} from "shared";
import {Maybe} from "../domain";
const props = defineProps<{ inAction: boolean, data: Maybe<QRDocument>}>()
const emit = defineEmits(['checkin', 'redeem:tshirt', 'close']);

const registration = computed(() => {
  return props.data && props.data.type === 'registration' ? props.data as QRRegistrationDocument : null;
});


const tshirt = computed(() => {
  if(!props.data) {
    return null;
  }
  if(props.data.type !== 'addon') {
    return null;
  }
  const addonDocument = props.data as QRAddonDocument;
  if(addonDocument.addonType !== 'tshirt') {
    return null;
  }
  return props.data as QRTShirtDocument
});

</script>
