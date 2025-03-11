<template>
  <div class="min-h-screen bg-[#242424] text-white flex flex-col">
    <!-- Top Navbar -->
    <competition-selector class="px-6 py-4"/>

    <!-- Main Content Wrapper -->
    <div class="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6 p-6 h-full overflow-x-scroll">
      <!-- Sidebar (Heats Selector) -->
      <heats-selector
          :heats="store.heatsForSelection"
          @update:selectedHeatIds="store.updateSelectedHeat"
          class="md:min-w-[250px]"
      />

      <!-- Main Content -->
      <div class="flex flex-col gap-6 w-full">
        <main class="flex flex-col items-center justify-center w-full">
          <div class="rounded-lg">
            <!-- No Competition Selected -->
            <div v-if="!competitionsStore.selectedCompetitionId" class="text-center text-red-400 mt-4">
              Selecione uma competição.
            </div>

            <!-- No Heat Selected -->
            <div v-else-if="!store.selectedHeatId" class="mt-6 space-y-8">
              <h2 class="text-xl font-semibold text-center mb-6 text-[#F7B63B]">
                Selecione um Heat
              </h2>
            </div>

            <!-- Display T-Shirts Table -->
            <div v-else-if="store.registrationsForSelection" class="mt-6 mb-12 space-y-8 w-full">
              <h2 class="text-xl font-semibold text-center mb-6 text-[#F7B63B]">
                T-shirts
              </h2>

              <!-- Fully Responsive Table -->
              <div>
                <AdminTable class="w-full "/>
              </div>
            </div>

            <!-- No Data Found -->
            <div v-else class="text-center text-gray-400 mt-4">
              Nenhum addon encontrado.
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CompetitionSelector from "../components/CompetitionSelector.vue";
import {useCompetitionStore} from "../data/competitions.ts";
import {useRegistrationsStore} from "../data/registrations.ts";
import AdminTable from "../components/AdminTable.vue";
import HeatsSelector from "../components/HeatsSelector.vue";

const competitionsStore = useCompetitionStore();
const store = useRegistrationsStore();
</script>
