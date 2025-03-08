<template>
  <div class="min-h-screen bg-[#242424] text-white">
    <header class="sticky top-0 z-50 bg-[#1E1E1E] text-white shadow-md">
      <div class="container mx-auto px-4">
        <div class="flex flex-col md:flex-row items-center justify-between py-4">
          <h1 class="text-2xl md:text-3xl font-bold tracking-tight text-[#F7B63B] text-center md:text-left">{{ title }}</h1>

          <div class="flex space-x-2 md:space-x-4 mt-4 md:mt-0">
            <router-link  to="/admin" class="text-white hover:text-[#F7B63B] transition-colors px-4 py-2 rounded-md bg-gray-700 hover:bg-[#F7B63B] shadow">
              Admin
            </router-link>
            <router-link to="/heats" class="text-white hover:text-[#F7B63B] transition-colors px-4 py-2 rounded-md bg-gray-700 hover:bg-[#F7B63B] shadow">
              Heats
            </router-link>
            <button
                @click="logout"
                class="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800
                  text-white rounded-lg shadow-sm hover:shadow transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-[#1E1E1E]"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="flex flex-col items-center bg-[#1E1E1E]">
      <router-view></router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import {useFirebaseAuth} from 'vuefire'
import {signOut} from 'firebase/auth'
import {useRouter} from 'vue-router'

const title = ref('Consola de Gestão')
const auth = useFirebaseAuth()
const router = useRouter()


const logout = async () => {
  try {
    await signOut(auth!)
    router.push('/login') // Redirect to login after logout
  } catch (error) {
    console.error('Logout failed:', error)
  }
}
</script>
