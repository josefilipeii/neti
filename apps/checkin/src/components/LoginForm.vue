<script lang="ts">
import { GoogleAuthProvider } from 'firebase/auth'
export const googleAuthProvider = new GoogleAuthProvider()
</script>

<script setup lang="ts">
import {useFirebaseAuth} from 'vuefire'
import {signInWithPopup} from 'firebase/auth'
import {useRouter} from 'vue-router'
import {ref} from 'vue'

const router = useRouter();
const error = ref('')
const auth = useFirebaseAuth();


const loginWithGoogle = async () => {
  try {
    await signInWithPopup(auth, googleAuthProvider);
    router.push('/'); // Redirect to root after login
  } catch (error) {
    console.error('Login failed:', error);
  }
};
</script>

<template>
  <div class="flex flex-col items-center justify-center  bg-[#242424]">
    <div class=" p-8 rounded shadow-md w-full ">
      <h2 class="text-2xl font-bold mb-6 text-center">Login</h2>
      <button
          @click="loginWithGoogle"
          class="flex items-center justify-center w-full
          max-w-xs px-4 py-2 text-sm font-medium text-gray-700 bg-white
          border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 focus:outline-none
          focus:ring-2 focus:ring-gray-200 focus:ring-offset-2">
        <img class="w-5 h-5 mr-2" src="https://www.svgrepo.com/show/355037/google.svg" alt="Google Logo" />
        Login com Google
      </button>
    </div>
  </div>
</template>