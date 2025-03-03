<template>
  <main class="container mx-auto px-4 py-8">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <CheckInForm/>
      </div>
    </div>
  </main>
</template>
<script setup lang="ts">
import CheckInForm from "../components/CheckInForm.vue";
import {onMounted, ref} from "vue";
import {useCompetitionsRepository} from "shared";
import {Competition} from "shared";
import type {Repository} from "shared";
import {useFirestore} from "vuefire";

const db = useFirestore();
const competitions = ref<Competition[]>([]);

const repository: Repository = useCompetitionsRepository(db);

onMounted(async () => {
  competitions.value = await repository.competitions();
  for (const competition of competitions.value) {
    competition.categories = await repository.categories(competition.id);
  }
});
</script>