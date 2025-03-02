<template>
  <div class="container mx-auto p-2 sm:p-4">
    <h1 class="text-xl sm:text-3xl font-bold mb-2 sm:mb-4">Competition Details</h1>
    <div v-for="competition in props.competitions" :key="competition.id" class="mb-4 sm:mb-6 p-2 sm:p-4 border rounded-lg shadow-sm">
      <h2 class="text-lg sm:text-2xl font-semibold">{{ competition.name }}</h2>
      <p class="text-gray-600">Location: {{ competition.location }}</p>
      <p class="text-gray-600">Days: {{ competition.days.join(', ') }}</p>
      <h3 class="text-md sm:text-xl font-medium mt-2 sm:mt-4">Categories</h3>
      <ul class="list-disc list-inside">
        <li v-for="category in competition.categories" :key="category.id" class="ml-2 sm:ml-4">
          {{ category.name }} ({{ category.type }})
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">

import type {Competition} from "shared/dist";

interface Props {
  competitions: Competition[]
}

const props = defineProps<Props>();
</script>
