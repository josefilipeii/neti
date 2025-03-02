<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import QRScanner from './QRScanner.vue';
import { mockFirebase } from '@shared';
import debounce from 'lodash.debounce';

const participant = ref<{
  id: string;
  name: string;
  email: string;
  category: string;
  teamName?: string;
  partnerName?: string;
  checkedIn: boolean;
}>({
  id: '',
  name: '',
  email: '',
  category: '',
  teamName: undefined,
  partnerName: undefined,
  checkedIn: false,
});

const loading = ref(false);
const error = ref('');
const email = ref('');
const isValidEmail = ref(false);
const readData = ref('N/A');

// Store available HYROX categories
const categories = ref<{ id: string; name: string }[]>([]);

// Store selected category for filtering (default: empty)
const selectedCategory = ref<string>('');

// Fetch categories from mockFirebase (or replace with real API)
const listCategories = async () => {
  try {
    categories.value = await mockFirebase.listCategories();
  } catch (err) {
    console.error('Error fetching categories:', err);
    error.value = 'Error loading categories';
  }
};

const validateEmail = (email: string) => {
  return /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email);
};

// Call listCategories on mount
onMounted(() => {
  listCategories();
});

const handleQRScanned = async (code: string) => {
  readData.value = code;
  loading.value = true;
  error.value = '';

  try {
    const data = await mockFirebase.getParticipant(code);

    if (!data) {
      error.value = 'Participant not found';
      return;
    }

    participant.value = {
      id: data.id,
      name: data.name,
      email: data.email,
      category: data.category,
      teamName: data.teamName,
      partnerName: data.partnerName,
      checkedIn: false,
    };
  } catch (err) {
    console.error('Error fetching participant:', err);
    error.value = 'Error fetching participant data';
  } finally {
    loading.value = false;
  }
};

// Search participant by email and optionally filter by selected category
const handleSearchByEmail = async () => {
  if (!isValidEmail.value) return;
  loading.value = true;
  error.value = '';

  try {
    console.log(email.value);
    const data = await mockFirebase.getByEmail(email.value);

    if (!data) {
      error.value = 'Participant not found';
      console.log(error.value)
      return;
    }

    participant.value = {
      id: data.id,
      name: data.name,
      email: data.email,
      category: data.category,
      teamName: data.teamName,
      partnerName: data.partnerName,
      checkedIn: false,
    };
  } catch (err) {
    console.error('Error fetching participant:', err);
    error.value = 'Error fetching participant data';
  } finally {
    loading.value = false;
  }
};

// Debounce API calls to avoid excessive requests
const debouncedSearch = debounce(handleSearchByEmail, 500);

// Watch for email changes and trigger search when valid
watch([email, selectedCategory], ([newEmail, theCategory]) => {
  isValidEmail.value = validateEmail(newEmail);
  console.log(isValidEmail.value , theCategory,newEmail, theCategory)
  if (isValidEmail.value && theCategory) {
    console.log(newEmail, theCategory)
    debouncedSearch();
  }
});



const handleSubmit = async () => {
  loading.value = true;
  error.value = '';

  try {
    await mockFirebase.checkIn(participant.value.id);

    participant.value = {
      id: '',
      name: '',
      email: '',
      category: '',
      teamName: undefined,
      partnerName: undefined,
      checkedIn: false,
    };
  } catch (err) {
    console.error('Error checking in participant:', err);
    error.value = 'Error checking in participant';
  } finally {
    loading.value = false;
  }
};


const categoryLabels: Record<string, string> = {
  'individual-male': 'Individual Male',
  'individual-female': 'Individual Female',
  'mixed-pairs': 'Mixed Pairs',
  'female-pairs': 'Female Pairs',
  team: 'Team',
};
</script>

<template>
  <div>
    <QRScanner @code-scanned="handleQRScanned" />
    <h3 class="font-medium text-gray-900">Dorsal Lido: {{ readData }}</h3>

    <div class="bg-white rounded-lg shadow-md p-6 mt-6">
      <h3 class="font-medium text-gray-900">Or By Email</h3>
      <input
        v-model="email"
        type="email"
        id="email"
        placeholder="Enter email"
        class="w-full p-2 border rounded-md focus:ring-2"
        :class="{
          'border-gray-300 focus:ring-blue-500': isValidEmail,
          'border-red-500 focus:ring-red-500': email && !isValidEmail,
        }"
      />
      <select
        v-model="selectedCategory"
        class="w-full p-2 border rounded-md focus:ring-2"
      >
        <option :value="false">-- Select Category --</option>
        <option
          v-for="category in categories"
          :key="category.id"
          :value="category.id"
        >
          {{ category.name }}
        </option>
      </select>
    </div>

    <div class="bg-white rounded-lg shadow-md p-6 mt-6">
      <h2 class="text-2xl font-semibold mb-6">Participant Check-in</h2>

      <div v-if="error" class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
        {{ error }}
      </div>

      <div v-if="participant.id" class="mb-6 p-4 bg-gray-50 rounded-md">
        <h3 class="font-medium text-gray-900">Participant Details</h3>
        <p class="mt-2 text-gray-600">Name: {{ participant.name }}</p>
        <p class="text-gray-600">
          Category:
          {{ categoryLabels[participant.category] || participant.category }}
        </p>
        <p v-if="participant.partnerName" class="text-gray-600">
          Partner: {{ participant.partnerName }}
        </p>
        <p v-if="participant.teamName" class="text-gray-600">
          Team: {{ participant.teamName }}
        </p>
      </div>

      <button
        @click="handleSubmit"
        :disabled="!participant.id || loading"
        class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="loading">Checking in...</span>
        <span v-else>Check In</span>
      </button>
    </div>
  </div>
</template>
