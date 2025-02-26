<script setup lang="ts">
import {  onMounted, onUnmounted } from 'vue'
import { Html5QrcodeScanner } from 'html5-qrcode'

const emit = defineEmits(['code-scanned'])

let html5QrcodeScanner: any = null

onMounted(() => {
  html5QrcodeScanner = new Html5QrcodeScanner(
    "qr-reader",
    { fps: 10, qrbox: { width: 250, height: 250 } },
    false
  )
  
  html5QrcodeScanner.render((decodedText: string) => {
    emit('code-scanned', decodedText)
    html5QrcodeScanner.pause()
    setTimeout(() => html5QrcodeScanner.resume(), 2000) // Resume after 2 seconds
  }, (error: any) => {
    console.warn(error)
  })
})

onUnmounted(() => {
  if (html5QrcodeScanner) {
    html5QrcodeScanner.clear()
  }
})
</script>

<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h2 class="text-2xl font-semibold mb-6">Scan QR Code</h2>
    <div id="qr-reader" class="w-full max-w-md mx-auto"></div>
  </div>
</template>