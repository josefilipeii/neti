<script setup lang="ts">
import { useFirebaseAuth } from 'vuefire'
import { getRedirectResult, signInWithRedirect, signOut } from 'firebase/auth'
import { useRouter } from 'vue-router'
import {onMounted, ref, watchEffect} from 'vue'
import { auth, googleAuthProvider } from '../firebase'

const router = useRouter()
const user = useFirebaseAuth()
const error = ref('')

const loginWithGoogle =  () => {
  signInWithRedirect(auth, googleAuthProvider).catch((reason) => {
    console.error('Failed signinRedirect', reason)
    error.value = reason
  })
}


const logout = async () => {
  await signOut(auth)
}


onMounted(() => {
  getRedirectResult(auth)
      .then((result) => {
        if (result.user) {
          router.push('/checkin')
        }
      })
      .catch((reason) => {
    console.error('Failed redirect result', reason)
    error.value = reason
  })
})

</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100">
    <div class="bg-white p-8 rounded shadow-md w-full max-w-sm">
      <h2 class="text-2xl font-bold mb-6 text-center">Login</h2>
      <button
          v-if="!user"
          @click="loginWithGoogle"
          class="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-700 transition duration-300"
      >
        Login with Google
      </button>
      <button
          v-if="user"
          @click="logout"
          class="w-full py-2 px-4 bg-red-500 text-white rounded hover:bg-red-700 transition duration-300"
      >
        Logout
      </button>
    </div>
  </div>
</template>