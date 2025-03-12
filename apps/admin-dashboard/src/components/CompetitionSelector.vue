<template>
  <nav class="bg-black shadow-lg px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-2">
    <div class="w-full md:w-auto flex flex-col md:flex-row items-center">
      <h2 class="text-lg font-semibold text-[#F7B63B] mb-2 md:mb-0 md:mr-4">Competições:</h2>
      <select v-model="store.selectedCompetitionId"
              class="bg-gray-700 text-white px-4 py-2 rounded w-full md:w-auto">
        <option v-for="competition in store.competitions" :key="competition.id" :value="competition.id">
          {{ competition.name }}
        </option>
      </select>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useCompetitionStore } from "../data/competitions.ts";

const store = useCompetitionStore();
</script>
