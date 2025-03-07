<template>
  <div class="min-h-screen grid grid-rows-[auto_1fr] bg-[#242424] text-white">
    <!-- Top Navbar -->
    <nav class="w-full bg-black shadow-lg px-6 py-4 flex items-center justify-between">
      <div class="flex items-center">
        <h2 class="text-lg font-semibold text-[#F7B63B] mr-4">Competições:</h2>
        <select v-model="selectedCompetition" @change="updateHeats"
                class="bg-gray-700 text-white px-4 py-2 rounded">
          <option v-for="competition in competitions" :key="competition.id" :value="competition">
            {{ competition.name }}
          </option>
        </select>
      </div>
    </nav>

    <div class="grid grid-cols-[250px_1fr] gap-6 p-6 h-full">
      <!-- Sidebar for Heats -->
      <aside class="bg-black shadow-lg p-4 overflow-y-auto rounded-lg">
        <h2 class="text-lg font-semibold text-center mb-4 text-[#F7B63B]">Heats</h2>
        <div v-if="filteredHeats.length > 0" class="space-y-2">
          <button v-for="heat in filteredHeats" :key="heat.id" @click="selectHeat(heat)"
                  class="w-full px-4 py-2 text-left rounded transition duration-200"
                  :class="{
                    'bg-[#F7B63B] text-black': selectedHeats.includes(heat),
                    'bg-gray-600 hover:bg-gray-500': !selectedHeats.includes(heat)
                  }">
            {{ heat.name }}
          </button>
          <button @click="noHeatsSelected" class="w-full px-4 py-2 text-left rounded transition duration-200"
                  :class="{
                    'bg-[#F7B63B] text-black': selectedHeats.length === 0,
                    'bg-gray-600 hover:bg-gray-500': selectedHeats.length !== 0
                  }">
            Nenhum
          </button>
          <button @click="selectAllHeats" class="w-full px-4 py-2 text-left rounded transition duration-200"
                  :class="{
                    'bg-[#F7B63B] text-black': selectedHeats.length === filteredHeats.length,
                    'bg-gray-600 hover:bg-gray-500': selectedHeats.length !== filteredHeats.length
                  }">
            Todos
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex flex-col items-center justify-center p-6 w-full">
        <div class="w-full max-w-5xl">
          <h2 class="text-xl font-semibold text-center mb-6 text-[#F7B63B]">Registros por Heat</h2>

          <div v-if="!selectedHeats.length" class="text-center text-red-400 mt-4">
            Nenhum heat selecionado.
          </div>

          <!-- Grouped Registration Table -->
          <div v-if="Object.keys(groupedRegistrations).length > 0" class="mt-6 space-y-8">
            <div v-for="(registrations, heatId) in groupedRegistrations" :key="heatId">
              <h3 class="text-lg font-semibold text-center mb-4 text-[#F7B63B]">
                Heat: {{ getHeatName(heatId) }}
              </h3>
              <div class="overflow-x-auto">
                <table class="w-full text-left bg-gray-800 rounded-lg overflow-hidden">
                  <thead>
                  <tr class="bg-[#F7B63B] text-black">
                    <th class="px-4 py-2">Nome</th>
                    <th class="px-4 py-2">Email</th>
                    <th class="px-4 py-2">Categoria</th>
                    <th class="px-4 py-2">Hora</th>
                    <th class="px-4 py-2">Dia</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-for="registration in registrations" :key="registration.id" class="border-b border-gray-600">
                    <td class="px-4 py-2">{{ JSON.stringify(registration) }}</td>
                    <td class="px-4 py-2">{{ JSON.stringify(registration)}}</td>
                    <td class="px-4 py-2">{{ registration.category }}</td>
                    <td class="px-4 py-2">{{ registration.day }}</td>
                    <td class="px-4 py-2">{{ registration.day }}</td>
                  </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div v-else class="text-center text-gray-400 mt-4">Nenhuma inscrição encontrada.</div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Competition, Heat, Registration } from "shared";
import { computed, shallowRef, watch } from "vue";
import { collection, CollectionReference, DocumentData, getFirestore, query, where } from 'firebase/firestore';
import { useCollection } from "vuefire";

const competitions = useCollection(collection(getFirestore(), 'competitions'));
const selectedCompetition = shallowRef<Competition | null>(null);
const selectedHeats = shallowRef<Heat[]>([]);
const registrationsCache = shallowRef<{ [heatId: string]: Registration[] }>({});
const heatDetails = shallowRef<{ [heatId: string]: Heat }>({});

const heatsSource = computed(() => {
  if (selectedCompetition.value) {
    return collection(getFirestore(), 'competitions', selectedCompetition.value.id, 'heats') as CollectionReference<DocumentData>;
  }
  return null;
});

const filteredHeats = useCollection(heatsSource);

const groupedRegistrations = computed(() => {
  const result: { [heatId: string]: Registration[] } = {};
  selectedHeats.value.forEach((heat) => {
    result[heat.id] = registrationsCache.value[heat.id] || [];
  });
  return result;
});

const fetchRegistrations = async () => {
  if (!selectedCompetition.value) return;

  const db = getFirestore();
  for (const heat of selectedHeats.value) {
    if (!registrationsCache.value[heat.id]) {
      const registrationsRef = collection(db, "competitions", selectedCompetition.value.id, "heats", heat.id, "registrations");
      registrationsCache.value[heat.id] = await useCollection(registrationsRef);
    }
  }
};

const selectHeat = (selectedHeat: Heat) => {
  if (selectedHeats.value.includes(selectedHeat)) {
    selectedHeats.value = selectedHeats.value.filter((heat) => heat.id !== selectedHeat.id);
  } else {
    selectedHeats.value = [...selectedHeats.value, selectedHeat];
  }
  fetchRegistrations();
};

const selectAllHeats = () => {
  selectedHeats.value = [...filteredHeats.value];
  fetchRegistrations();
};

const noHeatsSelected = () => {
  selectedHeats.value = [];
};

const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return "-";
  const date = new Date(timestamp.seconds * 1000);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
};

const getHeatName = (heatId: string) => {
  const heat = selectedHeats.value.find((h) => h.id === heatId);
  return heat ? heat.name : "Desconhecido";
};

const getHeatDay = (heatId: string) => {
  const heat = selectedHeats.value.find((h) => h.id === heatId);
  return heat ? heat.day : "-";
};
</script>

<style scoped>
table {
  border-collapse: collapse;
}
th, td {
  border: 1px solid #444;
}
</style>
