<template>
  <div class="sticky top-0 min-h-screen w-full grid grid-rows-[auto_1fr] bg-[#242424] text-white">
    <!-- Top Navbar -->
    <competition-selector/>

    <div class="grid grid-cols-[250px_1fr] gap-6 p-6 h-full overflow-y-auto">
      <heats-selector
          :heats="store.heatsForSelection"
          @update:selectedHeatIds="store.updateSelectedHeat"
      />

      <main class="flex flex-col items-center justify-center p-6 w-full">

        <HeatWrapper>
          <template  #heatTable>
            <HeatTable></HeatTable>
          </template>
        </HeatWrapper>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import {useCompetitionStore} from "../data/competitions.ts";
import CompetitionSelector from "../components/CompetitionSelector.vue";
import HeatsSelector from "../components/HeatsSelector.vue";
import HeatWrapper from "../components/HeatWrapper.vue";
import HeatTable from "../components/HeatTable.vue";


const store = useCompetitionStore();


</script>
