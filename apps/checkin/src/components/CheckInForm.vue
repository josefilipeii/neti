<script setup lang="ts">
import {computed, getCurrentInstance, reactive, ref, watch} from 'vue';
import QRScanner from './QRScanner.vue';
import CheckinModal from './CheckinModal.vue';
import { useDocument, useFirestore } from "vuefire";
import { collection, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from "../firebase";
import {QRDocument, QRRegistrationDocument} from "shared";
import CheckinSearch from "./CheckinSearch.vue";

const checkinFunction = httpsCallable(functions, "handleCheckin");
const db = useFirestore();

const enableCheckinButton = ref(false);
const error = ref('');
const message = ref('');
const paramData = reactive<{ token: string }>({ token: '' });
const isCheckinModalOpen = ref(false);
const isSearchModalOpen = ref(false);

const qrSource = computed(() =>
    paramData.token ? doc(collection(db, 'qrCodes'), paramData.token) : null
);

const { data: qrData, error: qrError, pending: qrPending } = useDocument(qrSource, { once: true });

const data = computed(() => {
  if (!qrData.value) return null;
  const qrDocument = qrData.value as QRDocument;
  return qrDocument.type === "registration" ? qrData.value as QRRegistrationDocument
      : null;
});

const changeTokenValue = (code: string | null) => {
  paramData.token = code || '';
};

const reload = () => {
  const actualToken = paramData.token;
  paramData.token = '';
  paramData.token = actualToken;
};

const handleCheckin = async () => {
  try {
    enableCheckinButton.value = true;
    await checkinFunction({ token: paramData.token });
    message.value = `Checkin realizado para ${data?.value?.registration?.dorsal}`;
    reload();
  } catch (err) {
    error.value = `Erro: ${err.message}`;
  }finally {
    enableCheckinButton.value = false;
    isSearchModalOpen.value = false;
  }
};

const clearContext = () => {
  paramData.token = '';
  message.value = '';
  error.value = '';
  isCheckinModalOpen.value = false;
};

// Watch for data arrival and open the modal automatically
watch(data, (newData) => {
  if (newData) {
    isCheckinModalOpen.value = true;
  }
});


watch(qrPending, (newPending) => {
  if (newPending) {
    message.value = 'A carregar dados...';
    enableCheckinButton.value = false;
  }else if(!newPending) {
    message.value = '';
    enableCheckinButton.value = true;
  }

  if (!newPending && !qrData.value) {
    error.value = `Código inválido ${paramData.token}`;
    (getCurrentInstance()?.refs.manualCheckin as any)?.reset();
    setTimeout(() => {
      error.value = '';
    }, 5000);
  }
});

const toggleManualSearch = () => {
  isSearchModalOpen.value = !isSearchModalOpen.value;
};

</script>

<template>
  <div>
    <QRScanner @code-scanned="changeTokenValue" />
    <div v-if="message" class="mb-4 p-4 bg-green-50 text-green-700 rounded-md">
      {{ message }}
    </div>
    <div v-if="error || qrError" class="bg-gray-50 rounded-lg shadow-md p-6 mt-6">
      <div v-if="error" class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
        {{ error }}
      </div>
      <div v-if="qrError" class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
        {{ qrError }}
      </div>
    </div>
    <button
        @click="toggleManualSearch"
        class="mt-4 w-full max-w-sm bg-blue-600 text-white py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-300"
    >
      Pesquisa Manual
    </button>
    <CheckinSearch
        v-if="isSearchModalOpen"
        ref="manualCheckin"
        @registration:selected="changeTokenValue"
        @close="toggleManualSearch"
    >
    </CheckinSearch>
    <CheckinModal
        v-if="isCheckinModalOpen && data"
        :inAction="enableCheckinButton"
        :data="data"
        @checkin="handleCheckin"
        @close="clearContext"
    />
  </div>
</template>
