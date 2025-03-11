<template>
  <nav class="bg-black shadow-lg px-6 py-4 flex items-center justify-between">
    <div class="flex items-center">
      <h2 class="text-lg font-semibold text-[#F7B63B] mr-4">Competições:</h2>
      <select v-model="store.selectedCompetitionId"
              class="bg-gray-700 text-white px-4 py-2 rounded">
        <option v-for="competition in store.competitions" :key="competition.id" :value="competition.id">
          {{ competition.name }}
        </option>
      </select>
    </div>
  </nav>
</template>

<script setup lang="ts">
import {useCompetitionStore} from "../data/competitions.ts";

const store = useCompetitionStore();
</script>
