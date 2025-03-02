<template>
  <div class="scanner">
    <label for="cameraSelect">Select Camera (Desktop Only):</label>
    <select v-if="!isMobile" v-model="selectedDeviceId" @change="saveCameraPreference" id="cameraSelect">
      <option v-for="device in videoDevices" :key="device.deviceId" :value="device.deviceId">
        {{ device.label || `Camera ${deviceIndex++}` }}
      </option>
    </select>

    <video ref="videoElement" class="video-preview" autoplay playsinline></video>
    <p v-if="error" class="error">{{ error }}</p>

    <button @click="toggleScanner" class="scanner-btn">
      {{ isScanning ? "Stop Scanner" : "Start Scanner" }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineEmits } from "vue";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";

const videoElement = ref<HTMLVideoElement | null>(null);
const isScanning = ref(false);
const error = ref<string | null>(null);
const codeReader = new BrowserMultiFormatReader();
let scannerControls: IScannerControls | null = null;
let currentStream: MediaStream | null = null;

const emit = defineEmits(["code-scanned"]);

// Detect if the user is on a mobile device
const isMobile = ref<boolean>(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));

// Camera selection
const videoDevices = ref<MediaDeviceInfo[]>([]);
const selectedDeviceId = ref<string | null>(null);
let deviceIndex = 1;

// Fetch available cameras
const getVideoDevices = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    videoDevices.value = devices.filter(device => device.kind === "videoinput");

    // If not mobile, allow the user to select a camera
    if (!isMobile.value) {
      const savedDeviceId = localStorage.getItem("preferredCamera");
      if (savedDeviceId && videoDevices.value.some(device => device.deviceId === savedDeviceId)) {
        selectedDeviceId.value = savedDeviceId;
      } else if (videoDevices.value.length > 0) {
        selectedDeviceId.value = videoDevices.value[0].deviceId; // Default to first camera
      }
    }
  } catch (err) {
    console.error("Error getting cameras:", err);
    error.value = "Unable to access cameras";
  }
};

// Save camera preference to localStorage
const saveCameraPreference = () => {
  if (selectedDeviceId.value) {
    localStorage.setItem("preferredCamera", selectedDeviceId.value);
  }
  restartScanner();
};

// Function to get constraints for camera selection
const getCameraConstraints = () => {
  if (isMobile.value) {
    return { video: { facingMode: "environment" } }; // Always use back camera on mobile
  } else {
    return {
      video: {
        deviceId: selectedDeviceId.value ? { exact: selectedDeviceId.value } : undefined
      }
    };
  }
};

const startScanner = async () => {
  isScanning.value = true;
  error.value = null;

  try {
    // Get the correct camera constraints
    const constraints = getCameraConstraints();

    // Start QR code scanning with selected device
    scannerControls = await codeReader.decodeFromVideoDevice(
        selectedDeviceId.value || undefined,
        videoElement.value!,
        (result, err) => {
          if (result) {
            emit("code-scanned", result.getText());
            stopScanner(); // Stop after successful scan
          }
          if (err) {
            error.value = "Error reading QR code";
          }
        }
    );

    // Store the active stream
    currentStream = await navigator.mediaDevices.getUserMedia(constraints);

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

  // Stop QR scanner
  if (scannerControls) {
    scannerControls.stop();
    scannerControls = null;
  }

  // Stop video stream
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }

  // Clear video element
  if (videoElement.value) {
    videoElement.value.srcObject = null;
  }
};

// Restart scanner when switching cameras (Desktop only)
const restartScanner = () => {
  if (isScanning.value) {
    stopScanner();
    startScanner();
  }
};

const toggleScanner = () => {
  if (isScanning.value) {
    stopScanner();
  } else {
    startScanner();
  }
};

// Fetch devices on mount
onMounted(() => {
  getVideoDevices();
});

// Cleanup on unmount
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
select {
  margin: 10px 0;
  padding: 5px;
  font-size: 14px;
}
</style>
