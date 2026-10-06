<template>
  <div class="flex flex-col gap-6">
    <PageHeader
      title="Expected vs actual (simulation)"
      :description="`Simulates a synthetic cohort whose per-question success matches the expected solve rates, and compares it with the actual cohort of ${profiles.students.length} students. Change the parameters and run again.`"
    />
    <SimulationForm />
    <SimulationResults v-if="result && comparison" />
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import PageHeader from '@/components/common/PageHeader.vue'
import { useSessionStore } from '@/stores/session.js'
import { useSimulationStore } from '@/stores/simulation.js'
import SimulationForm from './simulation/SimulationForm.vue'
import SimulationResults from './simulation/SimulationResults.vue'

const sessionStore = useSessionStore()
const { examKey, profiles } = storeToRefs(sessionStore)
const simulationStore = useSimulationStore()
const { result, comparison } = storeToRefs(simulationStore)

// Runs once per opened exam, not on every visit to the page.
onMounted(simulationStore.ensure)
watch(examKey, simulationStore.ensure)
</script>
