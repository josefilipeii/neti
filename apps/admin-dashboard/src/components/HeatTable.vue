<template>
  <h3 class="text-lg font-semibold text-center mb-4 text-[#F7B63B]">
    Heat: {{ store.selectedHeat?.name }}
  </h3>
  <div class="overflow-auto">
    <table class="text-left bg-gray-800 rounded-lg">
      <thead>
      <tr class="bg-[#F7B63B] text-black">
        <th class="px-4 py-6">Categoria</th>
        <th class="px-4 py-6">Dorsal</th>
        <th class="px-4 py-6">Dia</th>
        <th class="px-4 py-6">Hora</th>
        <th class="px-4 py-6">Nome</th>
        <th class="px-4 py-6">Email</th>
        <th class="px-4 py-6">Checkin</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="registration in store.registrationsForSelection"
          :key="registration.id"
          :class="{'text-green-500 font-bold': registration?.checkin?.at, 'border-b border-gray-600': true}"
      >
        <td class="px-4 py-6">{{ registration.category }}</td>
        <td class="px-4 py-6">{{ registration.id }}</td>
        <td class="px-4 py-6">{{ store.selectedHeat?.day }}</td>
        <td class="px-4 py-6">{{ store.selectedHeat?.time }}</td>
        <td class="px-4 py-6"><span v-for="participant in registration.participants">
                      {{ participant.name }}<br>
                    </span></td>
        <td class="px-4 py-6"><span v-for="participant in registration.participants">
                      {{ participant.email }}<br>
                    </span></td>
        <td class="px-4 py-6">
          <CheckinInfo :checkin="registration.checkin!"
                       :registration="registration.id!"
                       :heat="store.selectedHeat?.id!"
                       :competition="store.selectedCompetitionId!"
          ></CheckinInfo>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>
<script setup lang="ts">
import CheckinInfo from "../components/CheckinInfo.vue";
import {useRegistrationsStore} from "../data/registrations.ts";

const store = useRegistrationsStore();


</script>