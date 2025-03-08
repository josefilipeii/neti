<template>
  <aside class="bg-black shadow-lg p-4 overflow-y-auto rounded-lg sticky left-0">
    <h2 class="text-lg font-semibold text-center mb-4 text-[#F7B63B]">Heats</h2>
    <div v-if="heats" class="space-y-2">
      <div v-for="heat in heats" :key="heat.id">
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
import type {Heat} from "shared";
import {ref} from "vue";
import type {Maybe} from "../model";

const emit = defineEmits(['update:selectedHeatIds']);
defineProps<{ heats: Heat[] }>()


const selectedHeatId = ref<Maybe<string>>();
const selectedHeat = (id: string) => id === selectedHeatId.value;

const toggleHeatSelection = (id: string) => {
  if (selectedHeat(id)) {
    selectedHeatId.value = null;
  } else {
    selectedHeatId.value = id;
  }
  emit('update:selectedHeatIds', selectedHeatId.value);
}


</script>