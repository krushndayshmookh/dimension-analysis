import { reactive, ref, shallowRef, watch } from 'vue'
import { defineStore } from 'pinia'
import { DEFAULT_SIM_PARAMS, validateSimParams, simulateMany, compareToActual } from '@/lib/simulation.js'
import { useSessionStore } from './session.js'

// The simulation form and its latest result. Parameters persist while the app is
// open; the result is computed once per opened exam and whenever it is run again.
export const useSimulationStore = defineStore('simulation', () => {
  const session = useSessionStore()

  const form = reactive({ ...DEFAULT_SIM_PARAMS })
  const result = shallowRef(null)
  const comparison = shallowRef(null)
  const errors = ref([])
  const dirty = ref(false)
  let ranFor = null

  // flush: 'sync' so programmatic changes made before a run cannot re-flag it afterwards.
  watch(form, () => {
    dirty.value = true
  }, { flush: 'sync' })

  function run(newSeed = false) {
    const exam = session.exam
    if (!exam) return
    if (newSeed) form.seed = Math.floor(Math.random() * 2 ** 31)
    const { params, errors: problems } = validateSimParams({ ...form })
    errors.value = problems
    if (problems.length) return
    result.value = simulateMany(exam.dataset, params)
    comparison.value = compareToActual(result.value, exam.profiles, exam.paper)
    dirty.value = false
    ranFor = exam
  }

  function ensure() {
    if (session.exam && ranFor !== session.exam) run(false)
  }

  function reset() {
    Object.assign(form, { ...DEFAULT_SIM_PARAMS })
    run(false)
  }

  return { form, result, comparison, errors, dirty, run, ensure, reset }
})
