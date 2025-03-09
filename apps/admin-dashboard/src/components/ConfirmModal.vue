<template>
  <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
    <div class="bg-white rounded-lg shadow-lg w-1/3">
      <header class="p-4 border-b">
        <slot name="header"></slot>
      </header>
      <main class="p-4">
        <slot name="body"></slot>
      </main>
      <footer class="p-4 border-t">
        <slot name="footer"></slot>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>