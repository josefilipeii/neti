<script lang="ts">
import { GoogleAuthProvider } from 'firebase/auth'
export const googleAuthProvider = new GoogleAuthProvider()
</script>

<script setup lang="ts">
import {useFirebaseAuth} from 'vuefire'
import {signInWithPopup, signOut} from 'firebase/auth'
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
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100">
    <div class="bg-white p-8 rounded shadow-md w-full max-w-sm">
      <h2 class="text-2xl font-bold mb-6 text-center">Login</h2>
      <button
          @click="loginWithGoogle"
          class="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-700 transition duration-300"
      >
        Login with Google
      </button>
    </div>
  </div>
</template>