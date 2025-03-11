<template>
  <details>
    <summary>{{ props.checkin?.at ? 'Sim' : 'Não' }}</summary>
    <div v-if="props.checkin?.at">
      <p><strong>Check-in Time:</strong> {{ props.checkin?.at?.toDate()?.toLocaleString() }}</p>
      <p><strong>Checked in by:</strong> {{ props.checkin?.by }}</p>
      <p><strong>Check-in Method:</strong> {{ props.checkin?.how }}</p>
    </div>
  </details>
</template>

<script setup lang="ts">
import type {Redemption} from "shared";

const props = defineProps<{
  checkin?: Redemption; // Received from `registrations` collection
  competition: string;
  heat: string;
  registration: string;
}>();


</script>
