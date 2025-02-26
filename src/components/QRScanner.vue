<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import {Html5QrcodeScanner, Html5QrcodeScanType} from 'html5-qrcode'

const emit = defineEmits(['code-scanned'])
const isScanning = ref(false)
const lastScannedCode = ref('')
let html5QrcodeScanner: any = null

const startScanning = async () => {
  isScanning.value = true
  if (!html5QrcodeScanner) {
    try {
      html5QrcodeScanner = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 },
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]},
          false
      )
      html5QrcodeScanner.render(
          (decodedText: string) => {
            lastScannedCode.value = decodedText
            emit('code-scanned', decodedText)
            stopScanning() // Stop scanning after successful detection
          },
          (error: any) => {
            console.warn(error)
          }
      )
    } catch (error) {
      console.error("Error accessing camera:", error)
      isScanning.value = false
    }
  } else {
    html5QrcodeScanner.resume()
  }
}

const stopScanning = () => {
  if (html5QrcodeScanner) {
    html5QrcodeScanner.clear()
    html5QrcodeScanner = null
  }
  isScanning.value = false
}




onUnmounted(() => {
  stopScanning()
})
</script>

<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h2 class="text-2xl font-semibold mb-6">Scan QR Code</h2>

    <div class="flex gap-4 mb-4">
      <button
          @click="startScanning"
          :disabled="isScanning"
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Start Scanning
      </button>
      <button
          @click="stopScanning"
          :disabled="!isScanning"
          class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Stop Scanning
      </button>
    </div>

    <div id="qr-reader" class="w-full max-w-md mx-auto"></div>

    <div v-if="lastScannedCode" class="mt-4 p-4 bg-gray-50 rounded-md">
      <h3 class="font-medium text-gray-900">Last Scanned Code:</h3>
      <p class="mt-2 text-gray-600 break-all">{{ lastScannedCode }}</p>
    </div>
  </div>
</template>
