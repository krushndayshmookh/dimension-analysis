import { reactive, ref, shallowRef, watch } from 'vue'
import { DEFAULT_SIM_PARAMS, validateSimParams, simulateMany, compareToActual } from '@/lib/simulation.js'
import { useSession } from './session.js'

// The simulation form and its latest result. Parameters persist while the app is
// open; the result is recomputed when the exam or the parameters change.
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

export function useSimulation() {
  const { exam, dataset, profiles, paper } = useSession()

  function run(newSeed = false) {
    if (!exam.value) return
    if (newSeed) form.seed = Math.floor(Math.random() * 2 ** 31)
    const { params, errors: problems } = validateSimParams({ ...form })
    errors.value = problems
    if (problems.length) return
    result.value = simulateMany(dataset.value, params)
    comparison.value = compareToActual(result.value, profiles.value, paper.value)
    dirty.value = false
    ranFor = exam.value
  }

  return {
    form,
    result,
    comparison,
    errors,
    dirty,
    run,
    // Runs once per opened exam, not on every visit to the page.
    ensure() {
      if (exam.value && ranFor !== exam.value) run(false)
    },
    reset() {
      Object.assign(form, { ...DEFAULT_SIM_PARAMS })
      run(false)
    },
  }
}
