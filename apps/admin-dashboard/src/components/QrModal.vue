<template>
  <!-- Modal Overlay (Ensures full-page coverage & high z-index) -->
  <div
      class="fixed absolute z-1000 inset-0 bg-gray-900 bg-opacity-50 flex
       items-center justify-center z-900 overflow-y-clip overflow-x-scroll"
      @click.self="emit('close')"
  >
    <!-- Modal Content (Scrollable when needed) -->
    <div class="bg-white rounded-lg shadow-lg p-6 max-h-screen overflow-y-auto z-[10000]">
     <div v-if="qrRegistration" class="text-center">
       <h3 class="text-lg font-medium text-gray-900">Check-in</h3>
       <p class="text-sm text-gray-900 mt-2">QR: {{ qrRegistration?.id || 'N/A' }}</p>

       <!-- QR Code Details -->
       <div class="mt-4">
         <p class="text-gray-700 font-medium">ID da Competição: {{ qrRegistration?.competition?.name || 'N/A' }}</p>
         <p class="text-gray-700">Dorsal: {{ registration?.dorsal || 'N/A' }}</p>
         <p class="text-gray-700">Categoria: {{ registration?.category || 'N/A' }}</p>
         <p class="text-gray-700">
           Data: {{ registration?.day || 'N/A' }} às {{ registration?.time || 'N/A' }}
         </p>

         <!-- Participants List -->
         <h4 class="mt-4 font-medium text-gray-900">Participantes</h4>
         <ul class="bg-gray-100 p-3 rounded-md text-gray-900">
           <li v-for="(participant, index) in registration?.participants" :key="'participant-'+index">
             {{ participant.name || "Sem nome" }}
           </li>
         </ul>
       </div>

       <!-- Check-in Confirmation -->
       <div v-if="redeemed" class="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg mt-4">
         Check-in efetuado:
         {{
           redeemed?.at?.toDate
               ? redeemed?.at.toDate().toLocaleString("pt-PT", {timeZone: "Europe/Lisbon"})
               : "Data inválida"
         }}
       </div>
     </div>
      <div v-else-if="tshirt">
        <h3 class="text-lg font-medium text-gray-900">Tshirt</h3>
        <p class="text-sm text-gray-900 mt-2">QR: {{ tshirt.id || 'N/A' }}</p>

        <!-- Check-in Confirmation -->
        <div v-if="redeemed" class="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg mt-4">
          Levantamento efetuado:
          {{
            redeemed?.at?.toDate
                ? redeemed?.at.toDate().toLocaleString("pt-PT", {timeZone: "Europe/Lisbon"})
                : "Data inválida"
          }}
        </div>
      </div>


      <!-- QR Code & Barcode Display -->
      <div v-if="qrFiles?.qr || qrFiles?.barcode" class="mt-6 text-center">
        <h4 class="font-medium text-gray-900 mb-4">Arquivos QR</h4>

        <div class="flex items-center gap-4">
          <!-- QR Code Image -->
          <div v-if="qrFiles.qr" class="flex flex-col items-center">
            <p class="text-sm font-medium text-gray-800 mb-2">QR Code</p>
            <img :src="qrFiles.qr.url" alt="Barcode" class="w-40 h-12 border rounded-lg shadow-md">
            <a :href="qrFiles.qr.url" download class="text-blue-500 hover:underline text-sm mt-2">
              Download QR Code
            </a>
          </div>

          <!-- Barcode Image -->
          <div v-if="qrFiles.barcode" class="flex flex-col items-center">
            <p class="text-sm font-medium text-gray-800 mb-2">Código de Barras</p>
            <img :src="qrFiles.barcode.url" alt="Barcode" class="w-40 h-12 border rounded-lg shadow-md">
            <a :href="qrFiles.barcode.url" download class="text-blue-500 hover:underline text-sm mt-2">
              Download Código de Barras
            </a>
          </div>
          <div v-if="qrFiles.ticket" class="flex flex-col items-center">
            <p class="text-sm font-medium text-gray-800 mb-2">Bilhete</p>
            <a :href="qrFiles.ticket.url" download  target="_blank" class="text-blue-500 hover:underline text-sm mt-2">
              Download Bilhete
            </a>
          </div>
        </div>
      </div>

      <!-- Close Button -->
      <button
          @click="emit('close')"
          class="mt-4 bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 focus:outline-none"
      >
        Fechar
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import {computed, defineEmits} from "vue";
import {useQrStore} from "../data/qr-codes.ts";
import type {QRAddonDocument, QRTShirtDocument} from "shared";

const store = useQrStore();
const emit = defineEmits(["close"]);

const qrRegistration = computed(() => store.selectedRegistration);
const registration = computed(() => store.selectedRegistration?.registration);
const tshirt = computed(() => {
  if(store.selectedQrData?.type !== "addon"){
    return null;
  }
  if((store.selectedQrData as QRAddonDocument).addonType !== "tshirt"){
    return null;
  }
  return store.selectedQrData as QRTShirtDocument;

});
const qrFiles = computed(() => store.selectedQrData?.files);
const redeemed = computed(() => store.selectedQrData?.redeemed);
</script>
<style scoped>
.qr-modal {
  z-index: 1000; /* or any value higher than 50 */
}
</style>