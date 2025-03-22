<template>
  <QrModal v-if="showQrModal" @close="showQrModal = false"></QrModal>
  <div class="text-black">
    <ConfirmModal v-if="showSendEmailsConfirmModal" class="text-black">
      <template #header>
        <h3 class="text-lg font-semibold text-center mb-4 text-[#F7B63B]">
          Enviar emails?
        </h3>
      </template>
      <template #body>
        <h3 class="bold">
          Tem a certeza que deseja Enviar Emails?
        </h3>
        <p>
          Esta ação irá enviar os emails com os bilhetes para os seguintes dorsais:
        </p>
        <ul class="ml-4">
          <li v-for="reg in registrationsToSendTickets" :key="reg.id">
            <p> {{ (reg as Registration).qrId }}</p>
            <p class="ml-6" v-for="participant in (reg as Registration).participants">
              {{ participant.email }}<br/>
            </p>
          </li>
        </ul>
      </template>
      <template #footer>
        <button
            @click="sendTickets()"
            class="bg-[#F7B63B] text-black px-4 py-2 rounded-lg"
        >
          Confirmar
        </button>
        <button
            @click="closeConfirmModal()"
            class="bg-red-500 text-white px-4 py-2 rounded-lg"
        >
          Cancelar
        </button>
      </template>
    </ConfirmModal>
  </div>
  <div class="text-black">
    <ConfirmModal v-if="showRetryEmailsConfirmModal">
      <template #header>
        <h3 class="text-lg font-semibold text-center mb-4 text-[#F7B63B]">
          Reenviar emails?
        </h3>
      </template>
      <template #body>
        <h3 class="bold">
          Tem a certeza que deseja Reenviar Emails?
        </h3>
        <p>
          Esta ação irá tentar reenviar os emails com os bilhetes para os seguintes dorsais:
        </p>
        <ul class="ml-4">
          <li v-for="reg in registrationsToRetrySendTickets" :key="reg.id">
            <p> {{ (reg as Registration).qrId }}</p>
            <p class="ml-6" v-for="participant in (reg as Registration).participants">
              {{ participant.email }}<br/>
            </p>
          </li>
        </ul>
      </template>
      <template #footer>
        <button
            @click="retrySendTickets()"
            class="bg-[#F7B63B] text-black px-4 py-2 rounded-lg"
        >
          Confirmar
        </button>
        <button
            @click="closeRetryConfirmModal()"
            class="bg-red-500 text-white px-4 py-2 rounded-lg"
        >
          Cancelar
        </button>
      </template>
    </ConfirmModal>
  </div>

  <h3 class="text-lg font-semibold text-center mb-4 text-[#F7B63B]">
    Heat: {{ store.selectedHeat?.name }}
  </h3>

  <div class="w-full flex flex-row-reverse ">
    <button
        @click="promptSendEmailsConfirmation(remainingTicketsToSend)"
        class=" mr-4 bg-red-500 text-white px-4 py-2 rounded-lg"
    >
      Enviar emails
    </button>
    <button
        @click="promptReSendEmailsConfirmation(availableTicketsToRetry)"
        class="mr-4 bg-red-500 text-white px-4 py-2 rounded-lg"
    >
      Reenviar emails
    </button>

  </div>

  <div class="overflow-x-auto  mt-6">
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
              @click="promptSendEmailsConfirmation([registration])"
              class="bg-red-500 text-white px-4 py-2 rounded-lg"
          >
            Enviar email
          </button>
          <div v-else-if="registration.ticket?.scheduled && !registration.ticket?.sent">
            <span>Agendado: </span>
            <span>{{ registration.ticket?.scheduled?.toDate().toLocaleDateString() }} - {{
                registration.ticket?.scheduled?.toDate().toLocaleTimeString() }}</span>
          </div>
          <div v-else-if="registration.ticket?.sent">
            <span>Enviado: </span>
            <span>{{ registration.ticket?.sent?.toDate().toLocaleDateString() }} - {{
                registration.ticket?.sent?.toDate().toLocaleTimeString() }}</span>
          </div>
          <span v-if="registration?.ticket?.document"> ({{ registration.ticket.document }})</span>
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
  <div v-if="errorMessage" class="bg-gray-50 rounded-lg shadow-md p-6 mt-6">
    <div class="flex justify-between items-center">
      <div class="mt-2 p-4 bg-red-50 text-red-700 rounded-md">
        {{ errorMessage }}
      </div>
      <button @click="errorMessage = ''" class="text-red-700 font-bold">X</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, ref} from "vue";
import CheckinInfo from "../components/CheckinInfo.vue";
import CheckinActions from "../components/CheckinActions.vue";
import {useCompetitionStore} from "../data/competitions";
import QrModal from "../components/QrModal.vue";
import {useQrStore} from "../data/qr-codes.ts";
import {useRegistrationsStore} from "../data/registrations";
import {httpsCallable} from "firebase/functions";
import {functions} from "../firebase";
import ConfirmModal from "../components/ConfirmModal.vue";
import type {Registration} from "shared";


const triggerEmail = httpsCallable(functions, "triggerOnboardingEmail");
const triggerRetryEmail = httpsCallable(functions, "triggerRetryEmail");
const competitionsStore = useCompetitionStore();
const store = useRegistrationsStore();
const qrStore = useQrStore();
const showQrModal = ref(false);
const showSendEmailsConfirmModal = ref(false);
const showRetryEmailsConfirmModal = ref(false);
const errorMessage = ref<string>();

const registrationsToSendTickets = ref<Registration[]>([]);
const registrationsToRetrySendTickets = ref<Registration[]>([]);

// Track which rows are open
const openRows = ref(new Set<string>());

onMounted(() => {
  registrationsToSendTickets.value = [];
});

const remainingTicketsToSend = computed(() => {
  return store.registrationsForSelection?.map(r => r)
     .filter(r => r.qrId && !r.ticket?.scheduled && !r.ticket?.sent) || [];
});

const availableTicketsToRetry = computed(() => {
  return store.registrationsForSelection?.map(r => r)
     .filter(r => r.ticket?.document && r.ticket?.scheduled && !r.ticket?.sent) || [];
});


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


const promptSendEmailsConfirmation = (registrations: Registration[]) => {
  if(registrations.length > 0) {
    registrationsToSendTickets.value = registrations;
    showSendEmailsConfirmModal.value = true;
  }else{
    errorMessage.value = 'Nenhum dorsal selecionado ou disponível para envio de email';
  }
};

const promptReSendEmailsConfirmation = (registrations: Registration[]) => {
  if(registrations.length > 0) {
    registrationsToRetrySendTickets.value = registrations;
    showRetryEmailsConfirmModal.value = true;
  }else{
    errorMessage.value = 'Nenhum dorsal selecionado ou disponível para reenvio de email';
  }
};

const closeConfirmModal = () => {
  showSendEmailsConfirmModal.value = false;
  registrationsToSendTickets.value = [];
};

const closeRetryConfirmModal = () => {
  showRetryEmailsConfirmModal.value = false;
  registrationsToRetrySendTickets.value = [];
};


const sendTickets = async () => {
  try {
    const tickets = registrationsToSendTickets.value.map(r => r.qrId);
    await triggerEmail({tickets});
  } catch (err) {
    errorMessage.value = `Error sending ticket ${registrationsToSendTickets.value}: ${JSON.stringify(err)}`;
  } finally {
    closeConfirmModal();
  }
};

const retrySendTickets = async () => {
  try {
    const emails = registrationsToRetrySendTickets.value.map(r => r.ticket?.document);
    await triggerRetryEmail({emails});
  } catch (err) {
    errorMessage.value = `Error retrying ticket ${registrationsToRetrySendTickets.value}: ${JSON.stringify(err)}`;
  } finally {
    closeRetryConfirmModal();
  }
};

</script>
