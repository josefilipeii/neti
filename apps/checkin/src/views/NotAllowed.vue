<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="text-center">
      <h1 class="text-4xl font-bold text-red-600">Access Denied</h1>
      <p class="mt-4 text-lg text-gray-700">You do not have permission to view this page.</p>
      <router-link to="/" class="mt-6 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700">
        Go to Home
      </router-link>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NotAllowed'
}
</script>

<style scoped>
</style>