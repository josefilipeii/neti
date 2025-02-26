<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { mockFirebase } from '../lib/mockFirebase'

const participants = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const checkIns = await mockFirebase.getCheckIns()
    const allParticipants = await mockFirebase.getParticipants()
    
    participants.value = checkIns.map(checkIn => {
      const participant = allParticipants.find(p => p.id === checkIn.participantId)
      return {
        ...participant,
        checkedInAt: checkIn.checkedInAt
      }
    })
  } catch (error) {
    console.error('Error fetching participants:', error)
  } finally {
    loading.value = false
  }
})

const getCategoryLabel = (category: string) => {
  const categories: Record<string, string> = {
    'individual-male': 'Individual Male',
    'individual-female': 'Individual Female',
    'mixed-pairs': 'Mixed Pairs',
    'female-pairs': 'Female Pairs',
    'team': 'Team'
  }
  return categories[category] || category
}
</script>

<template>
  <div class="bg-white rounded-lg shadow-md p-6 mt-6">
    <h2 class="text-2xl font-semibold mb-6">Checked-in Participants</h2>
    
    <div v-if="loading" class="text-gray-500 text-center py-8">
      Loading participants...
    </div>
    
    <div v-else-if="participants.length === 0" class="text-gray-500 text-center py-8">
      No participants checked in yet
    </div>
    
    <ul v-else class="divide-y divide-gray-200">
      <li v-for="participant in participants" :key="participant.id" class="py-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">{{ participant.name }}</p>
            <p class="text-sm text-gray-500">{{ getCategoryLabel(participant.category) }}</p>
            <p v-if="participant.partnerName" class="text-sm text-gray-500">
              Partner: {{ participant.partnerName }}
            </p>
            <p v-if="participant.teamName" class="text-sm text-gray-500">
              Team: {{ participant.teamName }}
            </p>
            <p class="text-xs text-gray-400">
              Checked in: {{ new Date(participant.checkedInAt).toLocaleString() }}
            </p>
          </div>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Checked In
          </span>
        </div>
      </li>
    </ul>
  </div>
</template>