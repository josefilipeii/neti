<template>
  <QrModal v-if="showQrModal" @close="closeQrModal"></QrModal>
  <div>
    <div class="bg-gray-800 rounded-lg overflow-x-auto">
      <table class="text-left w-full">
        <thead>
        <tr class="bg-[#F7B63B] text-black">
          <th class="px-4 py-4">QRCode</th>
          <th class="px-4 py-4">Id Interno</th>
          <th class="px-4 py-4">Nome</th>
          <th class="px-4 py-4">Email</th>
          <th class="px-4 py-4">Tamanhos</th>
          <th class="px-6 py-4">Levantamento</th>
        </tr>
        </thead>
        <tbody v-if="tshirts.length">
        <tr
            v-for="tshirt in tshirts"
            :key="tshirt.id"
            :class="{ 'text-green-500 font-bold': tshirt?.redeemed?.at, 'border-b border-gray-600': true }"
        >
          <td class="px-4 py-4 cursor-pointer" @click="openQrModal(tshirt.referenceId)">
            <span>{{ tshirt.id }}</span>
          </td>
          <td class="px-4 py-4">{{ tshirt.referenceId }}</td>
          <td class="px-4 py-4">{{ tshirt.name }}</td>
          <td class="px-4 py-4">{{ tshirt.email }}</td>
          <td class="px-4 py-4">
            {{
              Object.entries(tshirt.sizes)
                  .filter(([, quantity]) => quantity)
                  .map(([size, quantity]) => `${size.toUpperCase()} : ${quantity}`)
                  .join(", ")
            }}
          </td>
          <td class="px-4 py-4">
            <button
                v-if="!tshirt.redeemed?.at"
                class="px-4 py-2 bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                @click="openRedemptionModal(tshirt.id!)"
            >
              Levantar
            </button>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <!-- Load More Button -->
    <div v-if="hasMore" class="flex justify-center my-4">
      <button
          class="px-4 py-2 bg-[#F7B63B] text-black rounded"
          :disabled="isLoading"
          @click="store.loadMoreTshirts"
      >
        {{ isLoading ? "Loading..." : "Load More" }}
      </button>
    </div>
  </div>
  <ConfirmModal v-if="showConfirmationModal">
    <template #header>
      <h3 class="text-lg font-semibold text-center text-[#F7B63B]">Confirm Action</h3>
    </template>
    <template #body>
      <p class="text-center">Are you sure you want to trigger this cloud function?</p>
    </template>
    <template #footer>
      <div class="flex justify-end space-x-4">
        <button class="px-4 py-2 bg-gray-600 text-white rounded" @click="showConfirmationModal = false">Cancel</button>
        <button class="px-4 py-2 bg-[#F7B63B] text-black rounded" @click="redeemAddon">Confirm</button>
      </div>
    </template>
  </ConfirmModal>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import QrModal from "../components/QrModal.vue";
import { useQrStore } from "../data/qr-codes.ts";
import { useAddonsStore } from "../data/addons.ts";
import {httpsCallable} from "firebase/functions";
import ConfirmModal from "../components/ConfirmModal.vue";
import {functions} from "../firebase.ts";

const store = useAddonsStore();
const qrStore = useQrStore();
const showQrModal = ref(false);
const showConfirmationModal = ref(false);
const addonRedemption = httpsCallable(functions, "handleAddonRedemption");
const error = ref<string>("");
const message = ref<string>("");
const selectedAddon = ref<string>("");


// Computed Properties
const tshirts = computed(() => store.tshirts[store.selectedCompetitionId!] || []);
const isLoading = computed(() => store.isLoading);
const hasMore = computed(() => store.lastVisible[store.selectedCompetitionId!] !== null);

// Load Data on Mount
onMounted(async () => {
  await store.loadTshirts();
});

// Open QR Modal
const openQrModal = (qr?: string) => {
  if (qr) {
    qrStore.setSelectedQrId(qr);
    showQrModal.value = true;
  }
};

const closeQrModal = () => {
  showQrModal.value = false;
};

const openRedemptionModal = (tshirtId: string) => {
  showConfirmationModal.value = true;
  selectedAddon.value = tshirtId;
};

const redeemAddon = async () => {
  try {
    if (!selectedAddon.value) {
      error.value = "Invalid t-shirt ID";
      return;
    }
    await addonRedemption({token: selectedAddon.value});
    message.value = `Check-in realizado para ${selectedAddon.value}`;
  } catch (err) {
    error.value = `Error: ${err}`;
  } finally {
    showConfirmationModal.value = false;
    selectedAddon.value = "";
    setTimeout(() => {
      error.value = "";
      message.value = "";
    }, 3000);
  }
};
</script>
