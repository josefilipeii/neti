<template>
  <aside class="bg-black shadow-lg p-4 overflow-y-auto rounded-lg sticky left-0">
    <h2 class="text-lg font-semibold text-center mb-4 text-[#F7B63B]">Heats</h2>
    <div v-if="store.heatsForSelection" class="space-y-2">
      <div v-for="heat in store.heatsForSelection || []" :key="heat.id">
        <button
            :class="{'bg-gray-700': selectedHeat(heat.id), 'bg-gray-500': !selectedHeat(heat.id)}"
            class="w-full text-left px-4 py-2 rounded"
            @click="toggleHeatSelection(heat.id)"
        >
          {{ heat.name }}
        </button>
      </div>
    </div>
  </aside>
</template>
<script setup lang="ts">
import {useCompetitionStore} from "../data/competitions.ts";

const store = useCompetitionStore();

const toggleHeatSelection = (heatId: string) => {
  if (store.selectedHeatId === heatId) {
     store.updateSelectedHeat(null);
  } else {
     store.updateSelectedHeat(heatId);
  }
};
const selectedHeat = (heatId: string) => store.selectedHeatId === heatId;



</script>