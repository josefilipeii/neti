<template>
  <div class="sticky top-0 min-h-screen grid grid-rows-[auto_1fr] bg-[#242424] text-white">
    <!-- Top Navbar -->
    <competition-selector/>
    <div class="mt-6"></div>
    <!-- Content Wrapper -->
    <div class="flex flex-col gap-6">
      <main class="flex flex-col items-center justify-center">
        <div class="rounded-lg ">
          <div v-if="!competitionsStore.selectedCompetitionId" class="text-center text-red-400 mt-4">
            Selecione uma competição.
          </div>
          <div v-else-if="store.tshirtsForSelection" class="mt-6 mb-12 space-y-8 overflow-y-clip">
            <h2 class="text-xl font-semibold text-center mb-6 text-[#F7B63B]">
              T-shirts
            </h2>
            <!-- Responsive Table -->

            <TshirtTable/>
          </div>
          <div v-else class="text-center text-gray-400 mt-4">
            Nenhum addon encontrado.
          </div>
        </div>
      </main>
    </div>
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
