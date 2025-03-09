<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import QRScanner from './QRScanner.vue';
import CheckinModal from './CheckinModal.vue';
import { useDocument, useFirestore } from "vuefire";
import { collection, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from "../firebase";
import {QRDocument, QRRegistrationDocument} from "shared";

const checkinFunction = httpsCallable(functions, "handleCheckin");
const db = useFirestore();

const loading = ref(false);
const error = ref('');
const message = ref('');
const paramData = reactive<{ token: string }>({ token: '' });
const isModalOpen = ref(false);

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
    loading.value = true;
    await checkinFunction({ token: paramData.token });
    message.value = `Checkin realizado para ${data?.value?.registration?.dorsal}`;
    reload();
  } catch (err) {
    error.value = `Erro: ${err.message}`;
  }finally {
    loading.value = false;
  }
};

const clearContext = () => {
  paramData.token = '';
  message.value = '';
  error.value = '';
  isModalOpen.value = false;
};

// Watch for data arrival and open the modal automatically
watch(data, (newData) => {
  if (newData) {
    isModalOpen.value = true;
  }
});


watch(qrPending, (newPending) => {
  if (!newPending && !qrData.value) {
    error.value = `Código inválido ${paramData.token}`;
    setTimeout(() => {
      error.value = '';
    }, 5000);
  }
});

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
    <CheckinModal
        v-if="isModalOpen && data"
        :inAction="loading || qrPending"
        :data="data"
        @checkin="handleCheckin"
        @close="clearContext"
    />
  </div>
</template>
