<template>
  <div class="w-full max-w-5xl">
    <h2 class="text-xl font-semibold text-center mb-6 text-[#F7B63B]">
      Registros por Heat
    </h2>
    <div v-if="!selectedHeat" class="text-center text-red-400 mt-4">
      Nenhum heat selecionado.
    </div>
    <div v-else-if="!registrationsAvailable" class="text-center text-gray-400 mt-4">
      Nenhuma inscrição encontrada.
    </div>
    <div v-else class="mt-6 space-y-8">
      <slot name="heatTable" ></slot>
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps<{selectedHeat: unknown, registrationsAvailable: unknown }>()

</script>
