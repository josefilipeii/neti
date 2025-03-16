<template>
  <div class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4">
    <div class="bg-gray-800 text-white rounded-lg shadow-lg p-4 w-full max-w-sm sm:max-w-md relative">
      <h1 class="text-lg sm:text-xl font-bold text-center text-[#F7B63B]">Check-in Manual</h1>

      <div class="flex flex-col items-center mt-4">

        <h2 class="text-base sm:text-lg font-semibold text-[#F7B63B]">Token:</h2>
        <input v-model="token" type="text" placeholder="Digite o token"
               class="mt-2 bg-gray-700 text-white px-4 py-2 rounded w-full">
        <button @click="searchToken" class="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none">Pesquisar</button>
        <h2 class="text-base sm:text-lg font-semibold text-[#F7B63B]">Competições:</h2>
        <select v-model="selectedCompetition" class="mt-2 bg-gray-700 text-white px-4 py-2 rounded w-full">
          <option v-for="competition in competitions" :key="competition.id" :value="competition.id">
            {{ competition.name }}
          </option>
        </select>

        <div v-if="selectedCompetition && heats.length > 0" class="w-full">
          <h2 class="text-base sm:text-lg font-semibold text-[#F7B63B] mt-4">Heats:</h2>
          <select v-model="selectedHeat" class="mt-2 bg-gray-700 text-white px-4 py-2 rounded w-full">
            <option v-for="heat in heats" :key="heat.id" :value="heat.id">
              {{ heat.id }}
            </option>
          </select>
        </div>

        <div v-if="selectedHeat && registrations.length > 0" class="w-full">
          <h2 class="text-base sm:text-lg font-semibold text-[#F7B63B] mt-4">Registrations:</h2>
          <select @change="handleRegistrationChange" v-model="selectedRegistration"
                  class="mt-2 bg-gray-700 text-white px-4 py-2 rounded w-full">
            <option v-for="registration in registrations" :key="registration.id" :value="registration.qrId">
              {{ registration.id }}
            </option>
          </select>
        </div>
      </div>

      <button
          @click="emit('close')"
          class="mt-4 w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none">
        Fechar
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {useCollection, useFirestore} from 'vuefire';
import {collection} from 'firebase/firestore';
import  debounce  from 'lodash.debounce';

const emit = defineEmits(['registration:selected', 'close']);
const token = ref('');

const searchToken = ()=> {
  emit('registration:selected', token.value);
  emit('close');

}

const selectedCompetition = ref('');
const selectedHeat = ref('');
const selectedRegistration = ref('');
const db = useFirestore();
const competitions = useCollection(collection(db, 'competitions'), {once: true});

const heatForSelectedCompetitionSrc = computed(() => {
  return selectedCompetition.value ?
      collection(db, `competitions/${selectedCompetition.value}/heats`) : null;
});

const heats = useCollection(heatForSelectedCompetitionSrc, {once: true});

const registrationsForSelectedHeatSrc = computed(() => {
  return selectedHeat.value ?
      collection(db, `competitions/${selectedCompetition.value}/heats/${selectedHeat.value}/registrations`) : null;
});

const registrations = useCollection(registrationsForSelectedHeatSrc, {once: true});

const handleRegistrationChange = () => {
  if (selectedRegistration.value) {
    emit('registration:selected', selectedRegistration.value);
    emit('close');
  }
};

const reset = () => {
  selectedCompetition.value = '';
  selectedHeat.value = '';
  selectedRegistration.value = '';
};

defineExpose({
  reset
});
</script>
