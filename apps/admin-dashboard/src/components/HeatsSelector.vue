<template>
  <div class="p-4">
    <!-- Mobile Dropdown -->
    <div class="md:hidden mb-4">
      <select
          v-if="store.heatsForSelection"
          v-model="selectedHeatId"
          class="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-md shadow-sm"
          @change="updateSelectedHeat"
      >
        <option value="" disabled>Selecione um Heat</option>
        <option v-for="heat in store.heatsForSelection" :key="heat.id" :value="heat.id">
          {{ heat.name }} ({{ heat.day }})
        </option>
      </select>
    </div>

    <!-- Desktop Buttons -->
    <div class="hidden md:block space-y-2">
      <h2 class="text-lg font-semibold text-center mb-4 text-[#F7B63B]">Heats</h2>
      <div v-if="store.heatsForSelection" class="space-y-2">
        <div v-for="heat in store.heatsForSelection || []" :key="heat.id">
          <button
              :class="{'bg-gray-700': selectedHeat(heat.id), 'bg-gray-500': !selectedHeat(heat.id)}"
              class="text-left px-4 py-2 rounded w-full"
              @click="toggleHeatSelection(heat.id)"
          >
            {{ heat.name }} ({{ heat.day }})
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, watch} from "vue";
import {useRegistrationsStore} from "../data/registrations.ts";

const store = useRegistrationsStore();
const selectedHeatId = ref(store.selectedHeatId); // Store selected heat for v-model

const updateSelectedHeat = () => {
  store.updateSelectedHeat(selectedHeatId.value);
};

const toggleHeatSelection = (heatId: string) => {
  if (store.selectedHeatId === heatId) {
    store.updateSelectedHeat(null);
  } else {
    store.updateSelectedHeat(heatId);
  }
};

const selectedHeat = (heatId: string) => store.selectedHeatId === heatId;

// Ensure dropdown reflects store updates
watch(() => store.selectedHeatId, (newVal) => {
  selectedHeatId.value = newVal;
});
</script>
