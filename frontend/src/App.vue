<template>
  <div class="min-h-screen bg-gray-100">
    <header class="bg-blue-600 text-white py-6 shadow-lg">
      <div class="container mx-auto px-4">
        <h1 class="text-3xl font-bold">{{ title }}</h1>
        <nav>
          <router-link to="/">Home</router-link>
          <router-link to="/about">About</router-link>
        </nav>
      </div>
    </header>

    <main class="container mx-auto px-4 py-8">
      <router-view></router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const title = ref('Fitness Competition Check-in')
</script>