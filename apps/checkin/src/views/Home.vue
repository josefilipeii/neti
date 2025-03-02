<template>
  <main class="container mx-auto px-4 py-8">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <CheckInForm/>
      </div>
      <div>
        <CompetitionDetails :competitions="competitions"/>
        <Statistics/>
        <ParticipantsList/>
      </div>
    </div>
  </main>
</template>
<script setup lang="ts">
import Statistics from "../components/Statistics.vue";
import CheckInForm from "../components/CheckInForm.vue";
import ParticipantsList from "../components/ParticipantsList.vue";
import CompetitionDetails from "../components/CompetitionsList.vue";
import {onMounted, ref} from "vue";
import {useCompetitionsRepository} from "shared";
import {Competition} from "shared";
import type {Repository} from "shared";
import {db} from "../firebase";



const competitions = ref<Competition[]>([]);

const repository: Repository = useCompetitionsRepository(db);

onMounted(async () => {
  competitions.value = await repository.competitions();
  for (const competition of competitions.value) {
    competition.categories = await repository.categories(competition.id);
  }
});
</script>