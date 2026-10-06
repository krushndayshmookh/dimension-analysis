<template>
  <SectionCard title="Parameters" help="simulation.parameters">
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Field v-for="f in fields" :key="f.key" :label="f.label" :html-for="`sim-${f.key}`" :hint="f.hint">
        <NumberInput :id="`sim-${f.key}`" v-model="form[f.key]" :step="f.step" :aria-label="f.label" />
      </Field>
      <Field label="Partial-credit questions" html-for="sim-partialCredit">
        <SelectField id="sim-partialCredit" v-model="form.partialCredit" :options="partialOptions" aria-label="Partial-credit questions" />
        <template #hint>
          Partial-credit questions are scored by test cases passed instead of all-or-nothing. Detection looks for students
          whose actual score is between 0 and full marks. The guessing floor applies to mcq questions ({{ mcqCount }} here).
        </template>
      </Field>
    </div>

    <NoticeAlert v-if="errors.length" kind="error">
      <ul class="list-disc pl-5"><li v-for="(e, i) in errors" :key="i">{{ e }}</li></ul>
    </NoticeAlert>

    <div class="flex flex-wrap items-center gap-2">
      <Button @click="run(false)">Run simulation</Button>
      <Button variant="outline" @click="run(true)">Run with a new random seed</Button>
      <Button variant="outline" @click="reset">Reset to defaults</Button>
      <span v-if="dirty" class="text-sm text-muted-foreground">Parameters changed since the last run.</span>
    </div>

    <Collapsible>
      <CollapsibleTrigger as-child>
        <Button variant="link" class="h-auto p-0">How the simulation works</Button>
      </CollapsibleTrigger>
      <CollapsibleContent class="mt-2 space-y-2 text-sm text-muted-foreground">
        <p>
          Each synthetic student has an ability drawn from a normal distribution (mean and spread above). For questions
          that are not partial credit, the chance of full marks follows a logistic curve in ability with the given
          discrimination, plus the guessing floor for mcq questions. The curve is positioned so that a student of mean
          ability succeeds with probability equal to the question's expected solve rate (kept between the minimum and
          maximum rates above).
        </p>
        <p>
          For partial-credit questions the student earns full marks with probability expected rate + effect × (ability −
          mean). Otherwise each test case passes with probability √(that probability) and marks are proportional to test
          cases passed.
        </p>
        <p>Expected rates: the CSV value, or the tier default where blank (see Paper analysis).</p>
      </CollapsibleContent>
    </Collapsible>
  </SectionCard>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import Field from '@/components/common/Field.vue'
import NoticeAlert from '@/components/common/NoticeAlert.vue'
import NumberInput from '@/components/common/NumberInput.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import SelectField from '@/components/common/SelectField.vue'
import { useSessionStore } from '@/stores/session.js'
import { useSimulationStore } from '@/stores/simulation.js'

const sessionStore = useSessionStore()
const { dataset } = storeToRefs(sessionStore)
const simulationStore = useSimulationStore()
const { form, errors, dirty } = storeToRefs(simulationStore)
const { run, reset } = simulationStore

const fields = [
  { key: 'cohortSize', label: 'Synthetic cohort size', step: 1, hint: 'Simulated students (1–100000). Larger values reduce sampling noise.' },
  { key: 'seed', label: 'Random seed', step: 1, hint: 'The same seed and parameters reproduce the same result.' },
  { key: 'runs', label: 'Runs for the range', step: 1, hint: 'Simulations (seed, seed+1, ...) used for the 90% range of expected results. 1 disables the range.' },
  { key: 'abilityMean', label: 'Ability mean', step: 0.1, hint: 'A student at this ability succeeds at exactly the expected solve rate.' },
  { key: 'abilitySd', label: 'Ability standard deviation', step: 0.05, hint: 'Spread of ability. 0 makes every synthetic student identical.' },
  { key: 'discrimination', label: 'Discrimination', step: 0.1, hint: 'How sharply the chance of success rises with ability.' },
  { key: 'guessing', label: 'Guessing floor', step: 0.05, hint: 'Minimum probability of full marks for mcq questions (0 to <1).' },
  { key: 'testCases', label: 'Test cases per partial-credit question', step: 1, hint: 'Marks are proportional to test cases passed.' },
  { key: 'partialAbilityEffect', label: 'Partial-credit ability effect', step: 0.01, hint: 'Change in full-credit probability per unit of ability above the mean.' },
  { key: 'minExpectedRatePct', label: 'Minimum expected rate (%)', step: 1, hint: 'Lower expected rates are raised to this before simulating.' },
  { key: 'maxExpectedRatePct', label: 'Maximum expected rate (%)', step: 1, hint: 'Higher expected rates are lowered to this before simulating.' },
]
const partialOptions = [
  { value: 'auto', label: 'Detect from the actual scores' },
  { value: 'all', label: 'All questions' },
  { value: 'none', label: 'None' },
]
const mcqCount = computed(() => dataset.value.questions.filter((q) => q.subtype === 'mcq').length)
</script>
