<template>
  <div class="scanner">
    <video ref="videoElement" class="video-preview"></video>
    <p v-if="error" class="error">{{ error }}</p>
    <button @click="toggleScanner" class="scanner-btn">
      {{ isScanning ? "Stop Scanner" : "Start Scanner" }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, defineEmits } from "vue";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";

const videoElement = ref<HTMLVideoElement | null>(null);
const isScanning = ref(false);
const error = ref<string | null>(null);
const codeReader = new BrowserMultiFormatReader();
let scannerControls: IScannerControls | null = null;
let currentStream: MediaStream | null = null;

const emit = defineEmits(["code-scanned"]);

const startScanner = async () => {
  isScanning.value = true;
  error.value = null;

  try {
    // Start QR code scanning and store the controls to stop it later
    scannerControls = await codeReader.decodeFromVideoDevice(
        undefined,
        videoElement.value!,
        (result, err) => {
          error.value = '';
          if (result) {
            emit("code-scanned", result.getText());
            stopScanner(); // Stop after a successful scan
          }
          if (err) {
            error.value = "Error reading QR code";
          }
        }
    );

    // Capture the video stream
    currentStream = await navigator.mediaDevices.getUserMedia({ video: true });
    // Assign stream to video element
    if (videoElement.value) {
      videoElement.value.srcObject = currentStream;
    }
  } catch (err) {
    console.error("Scanner Error:", err);
    error.value = "Could not access the camera";
    isScanning.value = false;
  }
};

const stopScanner = () => {
  isScanning.value = false;

  // Stop the QR scanner process
  if (scannerControls) {
    scannerControls.stop();
    scannerControls = null;
  }

  // Stop all video tracks to release the camera
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }

  // Clear the video stream
  if (videoElement.value) {
    videoElement.value.srcObject = null;
  }
};

const toggleScanner = () => {
  if (isScanning.value) {
    error.value = '';
    stopScanner();
  } else {
    startScanner();
  }
};

// Ensure cleanup when the component is destroyed
onUnmounted(() => {
  stopScanner();
});
</script>

<style scoped>
.scanner {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.video-preview {
  width: 100%;
  max-width: 400px;
  border: 2px solid black;
}
.error {
  color: red;
  margin-top: 10px;
}
.scanner-btn {
  margin-top: 10px;
  padding: 8px 12px;
  font-size: 16px;
  background-color: #007bff;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 4px;
}
.scanner-btn:hover {
  background-color: #0056b3;
}
</style>
