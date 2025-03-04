<template>
  <div class="min-h-screen bg-gray-50">
    <header class="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md">
      <div class="container mx-auto px-4">
        <div class="flex items-center justify-between py-4">
          <h1 class="text-2xl md:text-3xl font-bold tracking-tight">{{ title }}</h1>

          <button
              @click="toggleMenu"
              class="md:hidden p-2 rounded-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
              aria-label="Toggle menu"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
        </div>

        <nav class="pb-4 md:pb-0">
          <div
              :class="{'translate-x-0': isMenuOpen, '-translate-x-full md:translate-x-0': !isMenuOpen}"
              class="fixed md:relative top-[4rem] md:top-0 left-0 w-full md:w-auto
            bg-blue-600 md:bg-transparent
            transform transition-transform duration-300 ease-in-out md:transform-none
            p-4 md:p-0 shadow-lg md:shadow-none"
          >
            <div class="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-6">
              <router-link
                  to="/"
                  class="text-white/90 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-blue-500/20"
              >
                Checkins
              </router-link>
              <button
                  @click="logout"
                  class="w-full md:w-auto px-4 py-2 bg-red-500 hover:bg-red-600 active:bg-red-700
                text-white rounded-lg shadow-sm hover:shadow transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-blue-600"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
      </div>
    </header>

    <main class="container mx-auto px-4 py-8 max-w-7xl">
      <router-view></router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import {useFirebaseAuth} from 'vuefire'
import {signOut} from 'firebase/auth'
import {useRouter} from 'vue-router'

const title = ref('Fitness Competition Check-in')
const auth = useFirebaseAuth()
const router = useRouter()
const isMenuOpen = ref(false)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const logout = async () => {
  try {
    await signOut(auth)
    router.push('/login') // Redirect to login after logout
  } catch (error) {
    console.error('Logout failed:', error)
  }
}
</script>