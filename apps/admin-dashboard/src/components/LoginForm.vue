<script lang="ts">
import { GoogleAuthProvider } from 'firebase/auth'
export const googleAuthProvider = new GoogleAuthProvider()
</script>

<script setup lang="ts">
import {useFirebaseAuth} from 'vuefire'
import {signInWithPopup} from 'firebase/auth'
import {useRouter} from 'vue-router'

const router = useRouter();
const auth = useFirebaseAuth();


const loginWithGoogle = async () => {


  try {
    await signInWithPopup(auth!!, googleAuthProvider);
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
          class="w-full px-4 py-2 text-left rounded transition duration-200 bg-[#F7B63B] text-black hover:bg-gray-500"
      >
        Login with Google
      </button>
    </div>
  </div>
</template>