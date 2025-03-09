<template>
  <aside class="bg-black shadow-lg p-4 overflow-y-auto rounded-lg sticky left-0 float-left">
    <h2 class="text-lg font-semibold text-center mb-4 text-[#F7B63B]">Actions</h2>
    <div v-for="action in actions || []" :key="action.id">
      <button
          class="w-full text-left px-4 py-2 rounded"
          @click="promptConfirmation(action)"
      >
        {{ action.name }}
      </button>
    </div>
  </aside>
  <main>
    <div v-if="error" class="bg-red-500 text-white p-2 rounded mb-4">
      {{ error }}
    </div>
    <div v-if="pending" class="bg-yellow-500 text-white p-2 rounded mb-4">
      {{ pending }}
    </div>
    <div v-if="message" class="bg-green-500 text-white p-2 rounded mb-4">
      {{ message }}
    </div>
  </main>
  <ConfirmModal v-if="showModal">
    <template #header>
      <h3 class="text-lg font-semibold text-center mb-4 text-[#F7B63B]">Confirm Action</h3>
    </template>
    <template #body>
      <p class="text-center">Are you sure you want to trigger this cloud function?</p>
    </template>
    <template #footer>
      <div class="flex justify-end space-x-4">
        <button class="px-4 py-2 bg-gray-600 text-white rounded" @click="showModal = false">Cancel</button>
        <button class="px-4 py-2 bg-[#F7B63B] text-black rounded" @click="triggerCloudFunction">Confirm</button>
      </div>
    </template>
  </ConfirmModal>
</template>
<script setup lang="ts">
import {ref} from 'vue';
import ConfirmModal from '../components/ConfirmModal.vue';
import {functions} from "../firebase.ts";
import {httpsCallable} from "firebase/functions";
import type {HttpsCallable} from "firebase/functions";

const showModal = ref<boolean>(false);
const error = ref<string>('');
const message = ref<string>('');
const pending = ref<string>('');
const selectedAction = ref<Action | null>(null)

type Action = {
  id: string;
  name: string;
  callback: HttpsCallable;
}


const triggerRetryQrCodeFile = httpsCallable(functions, "triggerRetryQrCodeFile");

const actions: Action[] = [
  {
    id: 'triggerRetryQrCodeFile',
    name: 'Gerar Qr Codes',
    callback: triggerRetryQrCodeFile
  }
]


const triggerCloudFunction = async () => {
  try {

    // Call your cloud function here
    const action = selectedAction.value;
    if(!action) {
      console.log('No action selected');
      return;
    }
    pending.value = `A executar ${action.name}`;
    const result = action.callback();
    message.value = `${action.name} executado com sucesso`;
    return result;
  } catch (err) {
    error.value = `Error triggering cloud function: ${JSON.stringify(err)}`;
  } finally {
    selectedAction.value = null;
    showModal.value = false;
    pending.value = '';
    setTimeout(() => {
      error.value = '';
      message.value = '';
    }, 60000);
  }
};

const promptConfirmation = (action: Action) => {
  selectedAction.value = action
  showModal.value = true;

}


</script>