<template>
  <div class="min-h-screen bg-[#242424] text-white flex flex-col w-full">
    <!-- Header (No More Sticky) -->
    <header class="relative bg-[#1E1E1E] text-white shadow-md w-full">
      <div class="max-w-screen-lg w-full mx-auto px-4 md:px-6">
        <div class="flex flex-col md:flex-row items-center justify-between py-4">
          <h1 class="text-2xl md:text-3xl font-bold tracking-tight text-[#F7B63B] text-center md:text-left">
            {{ title }}
          </h1>

          <!-- Navigation -->
          <div class="flex flex-wrap justify-center md:justify-end gap-2 md:gap-4 mt-4 md:mt-0">
            <router-link to="/admin" class="btn-nav">Admin Dashboard</router-link>
            <router-link to="/manual-actions" class="btn-nav">Manual Actions</router-link>
            <router-link to="/heats" class="btn-nav">Heats</router-link>
            <router-link to="/addons" class="btn-nav">Addons</router-link>
            <button @click="logout" class="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>

    <main>
      <router-view />
    </main>


    <!-- Footer -->
    <footer class="bg-[#1E1E1E] text-center py-6 w-full">
      <div class="max-w-screen-lg w-full mx-auto px-4 md:px-6">
        <p class="text-gray-400">&nbsp;</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useFirebaseAuth } from "vuefire";
import { signOut } from "firebase/auth";
import { useRouter } from "vue-router";

const title = ref("Consola de Gestão");
const auth = useFirebaseAuth();
const router = useRouter();

const logout = async () => {
  try {
    await signOut(auth!);
    router.push("/login"); // Redirect to login after logout
  } catch (error) {
    console.error("Logout failed:", error);
  }
};
</script>

<style scoped>
@reference "./style.css";

/* Navigation Button */
.btn-nav {
  @apply text-white hover:text-[#F7B63B] transition-colors px-4 py-2 rounded-md bg-gray-700 hover:bg-[#F7B63B] shadow;
}

/* Logout Button */
.btn-logout {
  @apply px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-[#1E1E1E];
}
</style>
