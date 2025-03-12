<template>
  <div class="flex flex-col min-h-screen md:ml-0.5">
    <!-- Top Navbar -->
    <competition-selector class="w-full"/>

    <!-- Main Content -->
    <main class="flex flex-col md:flex-row flex-1 w-full">


      <!-- Content Section -->
      <div class="w-full md:ml-6 md:w-64 flex-grow p-4">
        <div v-if="!competitionsStore.selectedCompetitionId" class="text-center text-red-400 mt-4">
          Selecione uma competição.
        </div>
        <div v-else-if="store.tshirts[store.selectedCompetitionId!]" class="mt-6 mb-12 space-y-8 w-full">
          <h2 class="text-xl font-semibold text-center mb-6 text-[#F7B63B]">
            Competições
          </h2>
          <div>
            <TshirtTable class="w-full"/>
          </div>
        </div>
        <div v-else class="text-center text-gray-400 mt-4">
          Nenhum addon encontrado.
        </div>
      </div>
    </main>
  </div>
</template>
<script setup lang="ts">
import {useAddonsStore} from "../data/addons.ts";
import CompetitionSelector from "../components/CompetitionSelector.vue";
import TshirtTable from "../components/TshirtTable.vue";
import {useCompetitionStore} from "../data/competitions.ts";

const competitionsStore = useCompetitionStore();
const store = useAddonsStore();
</script>
