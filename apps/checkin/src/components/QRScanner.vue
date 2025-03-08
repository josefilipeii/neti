<template>
  <div class="flex flex-col items-center justify-center p-4">
    <!-- Camera Selection (Desktop Only) -->
    <div v-if="!isMobile" class="w-full max-w-sm mb-4">
      <label for="cameraSelect" class="block text-gray-700 font-medium mb-2">Select Camera:</label>
      <select
          v-model="selectedDeviceId"
          @change="saveCameraPreference"
          id="cameraSelect"
          class="w-full p-2 border rounded-lg bg-white shadow-sm focus:ring focus:ring-blue-300"
      >
        <option v-for="device in videoDevices" :key="device.deviceId" :value="device.deviceId">
          {{ device.label || `Camera ${deviceIndex++}` }}
        </option>
      </select>
    </div>

    <!-- QR Scanner Preview -->
    <div class="relative w-full max-w-sm aspect-square bg-gray-900 rounded-lg overflow-hidden shadow-lg">
      <video v-if="isScanning" ref="videoElement" class="w-full h-full object-cover" autoplay playsinline></video>
      <div v-if="!isScanning" class="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
        <p class="text-white text-sm">Camera inactive</p>
      </div>
    </div>

    <!-- Error Message -->
    <p v-if="error" class="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded-lg shadow">
      {{ error }}
    </p>

    <!-- Scanner Toggle Button -->
    <button
        @click="toggleScanner"
        class="mt-4 w-full max-w-sm bg-blue-600 text-white py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-300"
    >
      {{ isScanning ? "Stop Scanner" : "Start Scanner" }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";

const videoElement = ref<HTMLVideoElement | null>(null);
const isScanning = ref(false);
const error = ref<string | null>(null);
const codeReader = new BrowserMultiFormatReader();
let scannerControls: IScannerControls | null = null;
let currentStream: MediaStream | null = null;

const emit = defineEmits(["code-scanned"]);

const isMobile = ref<boolean>(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));

const videoDevices = ref<MediaDeviceInfo[]>([]);
const selectedDeviceId = ref<string | null>(null);
let deviceIndex = 1;

const getVideoDevices = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    videoDevices.value = devices.filter(device => device.kind === "videoinput");

    if (!isMobile.value) {
      const savedDeviceId = localStorage.getItem("preferredCamera");
      if (savedDeviceId && videoDevices.value.some(device => device.deviceId === savedDeviceId)) {
        selectedDeviceId.value = savedDeviceId;
      } else if (videoDevices.value.length > 0) {
        selectedDeviceId.value = videoDevices.value[0].deviceId;
      }
    }
  } catch (err) {
    console.error("Error getting cameras:", err);
    error.value = "Unable to access cameras";
  }
};

const saveCameraPreference = () => {
  if (selectedDeviceId.value) {
    localStorage.setItem("preferredCamera", selectedDeviceId.value);
  }
  restartScanner();
};

const getCameraConstraints = () => {
  return isMobile.value
      ? { video: { facingMode: "environment" } }
      : { video: { deviceId: selectedDeviceId.value ? { exact: selectedDeviceId.value } : undefined } };
};

const startScanner = async () => {
  isScanning.value = true;
  error.value = null;

  try {
    const constraints = getCameraConstraints();
    scannerControls = await codeReader.decodeFromVideoDevice(
        selectedDeviceId.value || undefined,
        videoElement.value!,
        (result, err) => {
          if (result) {
            emit("code-scanned", result.getText());
            stopScanner();
          }
          if (err) {
            error.value = "Error reading QR code";
          }
        }
    );

    currentStream = await navigator.mediaDevices.getUserMedia(constraints);

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
  error.value = null;

  if (scannerControls) {
    scannerControls.stop();
    scannerControls = null;
  }

  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }

  if (videoElement.value) {
    videoElement.value.srcObject = null;
  }
};

const restartScanner = () => {
  if (isScanning.value) {
    stopScanner();
    startScanner();
  }
};

const toggleScanner = () => {
  isScanning.value ? stopScanner() : startScanner();
};

onMounted(getVideoDevices);
onUnmounted(stopScanner);
</script>
