<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { mockFirebase } from '../lib/mockFirebase'

const checkedInParticipants = ref<any[]>([])
const loading = ref(true)
const isExpanded = ref(false)

onMounted(async () => {
  try {
    const checkIns = await mockFirebase.getCheckIns()
    const allParticipants = await mockFirebase.getParticipants()
    
    checkedInParticipants.value = checkIns.map(checkIn => {
      return allParticipants.find(p => p.id === checkIn.participantId)
    }).filter(Boolean)
  } catch (error) {
    console.error('Error fetching statistics:', error)
  } finally {
    loading.value = false
  }
})

const stats = computed(() => ({
  total: checkedInParticipants.value.length,
  categories: {
    'individual-male': checkedInParticipants.value.filter(p => p.category === 'individual-male').length,
    'individual-female': checkedInParticipants.value.filter(p => p.category === 'individual-female').length,
    'mixed-pairs': checkedInParticipants.value.filter(p => p.category === 'mixed-pairs').length,
    'female-pairs': checkedInParticipants.value.filter(p => p.category === 'female-pairs').length,
    'team': checkedInParticipants.value.filter(p => p.category === 'team').length,
  }
}))

const categoryLabels: Record<string, string> = {
  'individual-male': 'Individual Male',
  'individual-female': 'Individual Female',
  'mixed-pairs': 'Mixed Pairs',
  'female-pairs': 'Female Pairs',
  'team': 'Team'
}

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div class="bg-white rounded-lg shadow-md p-6 mb-6">
    <button 
      @click="toggleExpanded"
      class="md:hidden w-full flex items-center justify-between text-left"
    >
      <h2 class="text-2xl font-semibold">Check-in Statistics</h2>
      <svg 
        class="w-6 h-6 transform transition-transform duration-200"
        :class="{ 'rotate-180': isExpanded }"
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    
    <h2 class="hidden md:block text-2xl font-semibold mb-4">Check-in Statistics</h2>
    
    <div 
      class="md:block"
      :class="{ 'hidden': !isExpanded }"
    >
      <div v-if="loading" class="text-gray-500 text-center py-4">
        Loading statistics...
      </div>
      
      <div v-else class="grid grid-cols-2 gap-4 mt-4 md:mt-0">
        <div class="bg-blue-50 p-4 rounded-lg">
          <p class="text-sm text-blue-600">Total Check-ins</p>
          <p class="text-2xl font-bold text-blue-800">{{ stats.total }}</p>
        </div>
        
        <div v-for="(count, category) in stats.categories" :key="category" 
             class="bg-gray-50 p-4 rounded-lg">
          <p class="text-sm text-gray-600">{{ categoryLabels[category] }}</p>
          <p class="text-2xl font-bold text-gray-800">{{ count }}</p>
        </div>
      </div>
    </div>
  </div>
</template>