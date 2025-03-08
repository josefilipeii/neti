<template>
  <div class="w-full max-w-5xl">
    <div v-if="!store.selectedCompetitionId" class="text-center text-red-400 mt-4">
      Nenhum heat selecionado.
    </div>
    <div v-else-if="store.selectedHeatId" class="mt-6 space-y-8">
      <h2 class="text-xl font-semibold text-center mb-6 text-[#F7B63B]">
        Registros por Heat
      </h2>
      <slot name="heatTable" ></slot>
    </div>
    <div v-else-if="!store.registrationsForSelection" class="text-center text-gray-400 mt-4">
      Nenhuma inscrição encontrada.
    </div>
  </div>
</template>
<script setup lang="ts">
import {useCompetitionStore} from "../data/competitions.ts";

const store = useCompetitionStore();

</script>
