<script lang="ts">
import {GoogleAuthProvider} from 'firebase/auth'

export const googleAuthProvider = new GoogleAuthProvider()
</script>

<script setup lang="ts">
import {useFirebaseAuth} from 'vuefire'
import {signInWithPopup, signInWithCustomToken} from 'firebase/auth'
import {useRouter} from 'vue-router'
import {ref} from 'vue'
import {httpsCallable} from "firebase/functions";
import {functions} from "../firebase";

const router = useRouter();
const error = ref('')
const auth = useFirebaseAuth();
const showAgentForm = ref(false);
const agentUsername = ref('');
const agentPin = ref('');
const errorMessage = ref('');

const authenticateAgent = httpsCallable(functions, "handleAgentAuthentication");


const loginWithGoogle = async () => {
  try {
    await signInWithPopup(auth, googleAuthProvider);
    router.push('/'); // Redirect to root after login
  } catch (error) {
    console.error('Login failed:', error);
  }
};

const toggleAgentLogin = () => {
  showAgentForm.value = !showAgentForm.value;
}
const loginAgent = async () => {
  try {
    const response = await authenticateAgent({user: agentUsername.value, pin: agentPin.value}) as {data?: {token: string}};

    if (response.data?.token) {
      await signInWithCustomToken(auth, response.data.token);
      console.log("✅ Agent logged in successfully!");
      router.push('/'); // Redirect to root after login
    }
  } catch (error) {
    console.error("❌ Authentication failed:", error.message);
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center bg-[#242424]">
    <div class="p-8 rounded shadow-md w-full">
      <h2 class="text-2xl font-bold mb-6 text-center">Login</h2>

      <!-- Google Login Button -->
      <button
          @click="loginWithGoogle"
          class="flex items-center justify-center w-full max-w-xs px-4 py-2 text-sm font-medium text-gray-700 bg-white
               border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 focus:outline-none
               focus:ring-2 focus:ring-gray-200 focus:ring-offset-2">
        <img class="w-5 h-5 mr-2" src="https://www.svgrepo.com/show/355037/google.svg" alt="Google Logo"/>
        Login com Google
      </button>

      <!-- Agent Login Button -->
      <button
          @click="toggleAgentLogin"
          class="mt-4 flex items-center justify-center w-full max-w-xs px-4 py-2 text-sm font-medium text-gray-700 bg-white
               border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 focus:outline-none
               focus:ring-2 focus:ring-gray-200 focus:ring-offset-2">
        Login Agente
      </button>

      <!-- Agent Login Form (Only Shown if expanded) -->
      <div v-if="showAgentForm" class="mt-4 w-full max-w-xs">
        <input
            v-model="agentUsername"
            type="text"
            placeholder="Agente"
            class="w-full p-2 mb-2 border rounded"
        />
        <input
            v-model="agentPin"
            type="password"
            placeholder="PIN"
            class="w-full p-2 mb-2 border rounded"
        />
        <button
            @click="loginAgent"
            class="w-full px-4 py-2 text-sm font-medium text-white bg-blue-500
                 border border-blue-600 rounded-lg shadow-sm hover:bg-blue-600
                 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2">
          Entrar
        </button>
      </div>

      <!-- Error Message -->
      <p v-if="errorMessage" class="mt-2 text-red-500">{{ errorMessage }}</p>
    </div>
  </div>
</template>
