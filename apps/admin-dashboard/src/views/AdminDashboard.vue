<template>
  <div class="sticky top-0 min-h-screen w-full grid grid-rows-[auto_1fr] bg-[#242424] text-white">
    <!-- Top Navbar -->
    <competition-selector
        :competitions="store.competitions"
        @update:selectedCompetitionId="updateSelectedCompetition"
    />

    <div class="grid grid-cols-[250px_1fr] gap-6 p-6 h-full overflow-y-auto">
      <heats-selector
          :heats="store.getHeatsByCompetitionId(selectedCompetition!)"
          @update:selectedHeatIds="updateSelectedHeat"
      />

      <main class="flex flex-col items-center justify-center p-6 w-full">
        <HeatWrapper :selectedHeat="heat" :registrationsAvailable="registrations">
          <template  v-if="heat && registrations" #heatTable>
            <AdminTable :heat="heat" :registrations="registrations" :competitionId="selectedCompetition!"/>
          </template>
        </HeatWrapper>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import {useCompetitionStore} from "../data/competitions.ts";
import CompetitionSelector from "../components/CompetitionSelector.vue";
import {computed, ref, watch} from "vue";
import HeatsSelector from "../components/HeatsSelector.vue";
import type {Maybe} from "../model";
import HeatWrapper from "../components/HeatWrapper.vue";
import AdminTable from "../components/AdminTable.vue";


const store = useCompetitionStore();
const selectedCompetition = ref<Maybe<string>>(null);
const selectedHeat = ref<Maybe<string>>(null);



const heat = computed(() => selectedCompetition.value && selectedHeat.value ?
    store.getHeatById(selectedCompetition.value!!, selectedHeat.value!!)
    : null);

const registrations = computed(() => selectedCompetition.value && selectedHeat.value ?
    store.getRegistrationsByHeatId(selectedCompetition.value!!, selectedHeat.value!!)
    : null);


const updateSelectedCompetition = async (competition: string) => {
  selectedCompetition.value = competition;
}
const updateSelectedHeat = async (heat: string) => {
  selectedHeat.value = heat;
}


watch(selectedCompetition, async (competition) => {
  if (competition) {
    await store.fetchHeats(competition);
  }
});

watch(selectedHeat, async () => {
  if (selectedCompetition.value && selectedHeat.value) {
    await store.fetchRegistrations(selectedCompetition.value, selectedHeat.value);
  }
});


</script>
