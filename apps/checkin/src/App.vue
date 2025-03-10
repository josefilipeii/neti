<template>
  <div class="h-screen w-screen flex flex-col bg-[#2A2A2A] text-white">
    <header class="fixed top-0 left-0 right-0 z-50 bg-[#1E1E1E] text-white shadow-md">
      <div class="container mx-auto px-4 py-4 flex items-center justify-between">
        <h1 class="text-2xl font-bold tracking-tight text-[#F7B63B]">Entrada</h1>

        <div class="flex space-x-4">
          <router-link to="/checkin" class="text-white hover:text-[#F7B63B] transition-colors px-4 py-2 rounded-md bg-gray-700 hover:bg-[#F7B63B] shadow">
            Participantes
          </router-link>
          <button
              @click="logout"
              class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm hover:shadow transition-all">
            Logout
          </button>
        </div>
      </div>
    </header>

    <main class="flex-1 flex items-center justify-center p-4">
      <router-view></router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useFirebaseAuth } from 'vuefire';
import { signOut } from 'firebase/auth';
import { useRouter } from 'vue-router';

const auth = useFirebaseAuth();
const router = useRouter();

const logout = async () => {
  try {
    await signOut(auth!);
    router.push('/login');
  } catch (error) {
    console.error('Logout failed:', error);
  }
};
</script>
