<template>
  <QrModal v-if="showQrModal" @close="showQrModal = false"></QrModal>

  <h3 class="text-lg font-semibold text-center mb-4 text-[#F7B63B]">
    Heat: {{ store.selectedHeat?.name }}
  </h3>

  <div class="overflow-x-auto">
    <table class="w-full text-left bg-gray-800 rounded-lg hidden md:table">
      <thead>
      <tr class="bg-[#F7B63B] text-black">
        <th class="px-4 py-3">Categoria</th>
        <th class="px-4 py-3">Dorsal</th>
        <th class="px-4 py-3">Dia</th>
        <th class="px-4 py-3">Hora</th>
        <th class="px-4 py-3">Nome</th>
        <th class="px-4 py-3">Email</th>
        <th class="px-4 py-3">Contacto</th>
        <th class="px-6 py-3">Check-in</th>
        <th class="px-4 py-3">QR</th>
        <th class="px-4 py-3">Email</th>
      </tr>
      </thead>
      <tbody>
      <tr
          v-for="registration in store.registrationsForSelection"
          :key="registration.id"
          :class="{'text-green-500 font-bold': registration?.checkin?.at, 'border-b border-gray-600': true}"
      >
        <td class="px-4 py-3">{{ registration.category }}</td>
        <td class="px-4 py-3">{{ registration.id }}</td>
        <td class="px-4 py-3">{{ store.selectedHeat?.day }}</td>
        <td class="px-4 py-3">{{ store.selectedHeat?.time }}</td>
        <td class="px-4 py-3">
            <span v-for="participant in registration.participants">
              {{ participant.name }}<br/>
            </span>
        </td>
        <td class="px-4 py-3">
            <span v-for="participant in registration.participants">
              {{ participant.email }}<br/>
            </span>
        </td>
        <td class="px-4 py-3">
            <span v-for="participant in registration.participants">
              {{ participant.contact }}<br/>
            </span>
        </td>
        <td class="px-6 py-3">
          <CheckinInfo
              :checkin="registration.checkin!"
              :registration="registration.id!"
              :heat="store.selectedHeat?.id!"
              :competition="store.selectedCompetitionId!"
          />
          <CheckinActions
              :competition="competitionsStore.selectedCompetitionId!"
              :heat="store.selectedHeat?.id!"
              :registration="registration?.id!"
              :qrId="registration?.qrId!"
          />
        </td>
        <td class="px-4 py-3 hover:cursor-pointer" @click="openQrModal(registration.qrId)">
          <span>{{ registration.qrId }}</span>
        </td>
        <td class="px-4 py-3">
          <button
              v-if="registration.qrId && !registration.ticket?.scheduled && !registration.ticket?.sent"
              @click="sendTicket(registration.qrId)"
              class="text-blue-400 underline"
          >
            Enviar email
          </button>
          <span v-else-if="registration.ticket?.scheduled && !registration.ticket?.sent">A agendar...</span>
          <span v-else-if="registration.ticket?.sent">Enviado</span>
        </td>
      </tr>
      </tbody>
    </table>

    <!-- Mobile Collapsible List -->
    <div class="md:hidden space-y-4">
      <div
          v-for="registration in store.registrationsForSelection"
          :key="registration.id"
          class="bg-gray-800 rounded-lg p-4"
      >
        <!-- Collapsible Header (Dorsal) -->
        <button
            class="w-full text-left font-semibold text-[#F7B63B] flex justify-between items-center"
            @click="toggleCollapse(registration.id!!)"
        >
          Dorsal: {{ registration.id }}
          <span>{{ openRows.has(registration.id!!) ? "▲" : "▼" }}</span>
        </button>

        <!-- Collapsible Content -->
        <div v-show="openRows.has(registration.id!!)" class="mt-2 transition-all duration-300">
          <p><span class="font-semibold text-gray-400">Categoria:</span> {{ registration.category }}</p>
          <p><span class="font-semibold text-gray-400">Dia:</span> {{ store.selectedHeat?.day }}</p>
          <p><span class="font-semibold text-gray-400">Hora:</span> {{ store.selectedHeat?.time }}</p>
          <p><span class="font-semibold text-gray-400">Nome:</span>
            <span v-for="participant in registration.participants" :key="participant.name">
              {{ participant.name }}<br/>
            </span>
          </p>
          <p><span class="font-semibold text-gray-400">Email:</span>
            <span v-for="participant in registration.participants" :key="participant.email">
              {{ participant.email }}<br/>
            </span>
          </p>
          <p><span class="font-semibold text-gray-400">Contacto:</span>
            <span v-for="participant in registration.participants" :key="participant.contact">
              {{ participant.contact }}<br/>
            </span>
          </p>

          <div class="mt-2 flex justify-between">
            <button
                @click="openQrModal(registration.qrId)"
                class="text-blue-400 underline"
            >
              Ver QR
            </button>
            <CheckinActions
                :competition="competitionsStore.selectedCompetitionId!"
                :heat="store.selectedHeat?.id!"
                :registration="registration?.id!"
                :qrId="registration?.qrId!"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref} from "vue";
import CheckinInfo from "../components/CheckinInfo.vue";
import CheckinActions from "../components/CheckinActions.vue";
import {useCompetitionStore} from "../data/competitions";
import QrModal from "../components/QrModal.vue";
import {useQrStore} from "../data/qr-codes.ts";
import {useRegistrationsStore} from "../data/registrations";
import {httpsCallable} from "firebase/functions";
import {functions} from "../firebase";


const triggerEmail = httpsCallable(functions, "triggerOnboardingEmail");
const competitionsStore = useCompetitionStore();
const store = useRegistrationsStore();
const qrStore = useQrStore();
const showQrModal = ref(false);

// Track which rows are open
const openRows = ref(new Set<string>());

// Toggle collapsible row
const toggleCollapse = (id: string) => {
  if (openRows.value.has(id)) {
    openRows.value.delete(id);
  } else {
    openRows.value.add(id);
  }
};

const openQrModal = (qr?: string) => {
  if (qr) {
    qrStore.setSelectedQrId(qr);
    showQrModal.value = true;
  }
};

const sendTicket = async (qrId: string) => {
  try {
    await triggerEmail({tickets: [qrId]});
  } catch (err) {
    console.error(err);
  }
};

</script>
