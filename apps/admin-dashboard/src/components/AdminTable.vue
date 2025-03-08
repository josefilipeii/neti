<template>
  <h3 class="text-lg font-semibold text-center mb-4 text-[#F7B63B]">
    Heat: {{ store.selectedHeat?.name }}
  </h3>
  <div class="overflow-x-auto">
    <table class="w-full text-left bg-gray-800 rounded-lg overflow-hidden">
      <thead>
      <tr class="bg-[#F7B63B] text-black">
        <th class="px-4 py-6">Categoria</th>
        <th class="px-4 py-6">Dorsal</th>
        <th class="px-4 py-6">Dia</th>
        <th class="px-4 py-6">Hora</th>
        <th class="px-4 py-6">Nome</th>
        <th class="px-4 py-6">Email</th>
        <th class="px-4 py-6">Contacto</th>
        <th class="px-6 py-6">Checkin</th>
        <th class="px-4 py-6">Qr</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="registration in store.registrationsForSelection" :key="registration.id" class="border-b border-gray-600">
        <td class="px-4 py-6">{{ registration.category?.name }}</td>
        <td class="px-4 py-6">{{ registration.id }}</td>
        <td class="px-4 py-6">{{ store.selectedHeat?.day }}</td>
        <td class="px-4 py-6">{{ store.selectedHeat?.time }}</td>
        <td class="px-4 py-6"><span v-for="participant in registration.participants">
                      {{ participant.name }}<br>
                    </span></td>
        <td class="px-4 py-6"><span v-for="participant in registration.participants">
                      {{ participant.email }}<br>
                    </span></td>
        <td class="px-4 py-6"><span v-for="participant in registration.participants">
                      {{ participant.contact }}<br>
                    </span></td>
        <td class="px-6 py-6">
          <CheckinInfo :checkin="registration.checkin!"
                       :registration="registration.id!"
                       :heat="store.selectedHeat?.id!"
                       :competition="store.selectedCompetitionId!"
          ></CheckinInfo>
          <CheckinActions :competition="store.selectedCompetitionId!"
                          :heat="store.selectedHeat?.id!"
                          :registration="registration?.id!"
                          :qrId="registration?.qrId!"
          ></CheckinActions>
        </td>
        <td class="px-4 py-6">{{ registration.qrId }}</td>
      </tr>
      </tbody>
    </table>
  </div>
</template>
<script setup lang="ts">
import CheckinInfo from "../components/CheckinInfo.vue";
import CheckinActions from "../components/CheckinActions.vue";
import {useCompetitionStore} from "../data/competitions.ts";

const store = useCompetitionStore();


</script>