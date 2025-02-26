<script setup lang="ts">
import { ref } from 'vue'
import CheckInForm from './components/CheckInForm.vue'
import ParticipantsList from './components/ParticipantsList.vue'
import Statistics from './components/Statistics.vue'

const title = ref('Fitness Competition Check-in')
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <header class="bg-blue-600 text-white py-6 shadow-lg">
      <div class="container mx-auto px-4">
        <h1 class="text-3xl font-bold">{{ title }}</h1>
      </div>
    </header>

    <main class="container mx-auto px-4 py-8">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <CheckInForm />
        </div>
        <div>
          <Statistics />
          <ParticipantsList />
        </div>
      </div>
    </main>
  </div>
</template>