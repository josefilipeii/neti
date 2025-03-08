<template>
  <nav class="w-full bg-black shadow-lg px-6 py-4 flex items-center justify-between sticky top-0">
    <div class="flex items-center">
      <h2 class="text-lg font-semibold text-[#F7B63B] mr-4">Competições:</h2>
      <select v-model="selectedCompetitionId"
              @change="changeSelectedCompetition"
              class="bg-gray-700 text-white px-4 py-2 rounded">
        <option v-for="competition in competitions" :key="competition.id" :value="competition.id">
          {{ competition.name }}
        </option>
      </select>
    </div>
  </nav>
</template>
<script setup lang="ts">
import type {Competition} from "shared";
import {ref} from "vue";
import type {Maybe} from "../model";

const emit = defineEmits(['update:selectedCompetitionId']);
defineProps<{ competitions: Competition[] }>()

const selectedCompetitionId = ref<Maybe<string>>(null);


// @ts-ignore
const changeSelectedCompetition =  ($event) => emit('update:selectedCompetitionId', $event.target.value);
</script>