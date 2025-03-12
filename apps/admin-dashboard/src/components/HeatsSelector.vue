<template>
    <!-- Mobile Dropdown (Full Width) -->
    <div class="md:hidden mb-2 w-full">
      <h2 class="text-lg font-semibold text-[#F7B63B] mb-2">Selecione um Heat</h2>
      <select
          v-if="store.heatsForSelection"
          v-model="selectedHeatId"
          class="block w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-md shadow-sm"
          @change="updateSelectedHeat"
      >
        <option value="" disabled>Selecione um Heat</option>
        <option v-for="heat in store.heatsForSelection" :key="heat.id" :value="heat.id">
          {{ heat.name }} ({{ heat.day }} - {{ heat.time }})
        </option>
      </select>
    </div>

    <!-- Desktop View (Collapsible Sections) -->
    <div v-if="heatsGroupedByDay" class="hidden md:block">
      <h2 class="text-lg font-semibold text-center text-[#F7B63B] mb-2">Heats</h2>

      <div v-for="[day, heats] in Object.entries(heatsGroupedByDay)" :key="day" class="mb-2 border border-gray-900 rounded">
        <!-- Day Header -->
        <button
            class="w-full bg-gray-600 px-3 py-2 text-white rounded-t flex justify-between items-center"
            @click="toggleDay(day)"
        >
          <span>{{ day }}</span>
          <span>{{ expandedDays[day] ? '▲' : '▼' }}</span>
        </button>

        <!-- Heat Buttons (One Per Row, Full Width) -->
        <div v-if="expandedDays[day]" class="p-2">
          <div v-for="heat in heats" :key="heat.id" class="mb-2">
            <button
                :class="{'bg-blue-800': selectedHeat(heat.id), 'bg-gray-500': !selectedHeat(heat.id)}"
                class="w-full text-left px-3 py-2 rounded"
                @click="toggleHeatSelection(heat.id)"
            >
              {{ heat.name }} ({{ heat.time }})
            </button>
          </div>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRegistrationsStore } from "../data/registrations.ts";
import type { Heat } from "shared";

const store = useRegistrationsStore();
const selectedHeatId = ref(store.selectedHeatId);
const expandedDays = ref<{ [key: string]: boolean }>({}); // Track which days are expanded

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

// Group heats by day and sort by time
const heatsGroupedByDay = computed(() => {
  if (!store.heatsForSelection) return [];

  return store.heatsForSelection
      .slice()
      .sort((a, b) => a.time.localeCompare(b.time)) // Sort by time (assuming HH:mm format)
      .reduce((acc, heat) => {
        if (!acc[heat.day]) acc[heat.day] = [];
        acc[heat.day].push(heat);
        return acc;
      }, {} as Record<string, Heat[]>);
});

// Expand the correct group if a heat is selected
onMounted(() => {
  if (store.selectedHeatId && store.heatsForSelection) {
    const selectedHeat = store.heatsForSelection.find(h => h.id === store.selectedHeatId);
    if (selectedHeat) {
      expandedDays.value[selectedHeat.day] = true;
    }
  }
});

// Toggle a specific day's collapse state
const toggleDay = (day: string) => {
  expandedDays.value[day] = !expandedDays.value[day];
};

// Ensure dropdown reflects store updates
watch(() => store.selectedHeatId, (newVal) => {
  selectedHeatId.value = newVal;
});
</script>
