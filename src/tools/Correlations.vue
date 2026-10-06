<template>
  <section class="view-panel">
    <div class="view-header">
      <div>
        <h2 class="view-title">Correlations</h2>
        <p class="view-desc">
          How students' mastery in one {{ unit }} relates to their mastery in another. A positive coefficient means students
          who do well in one tend to do well in the other.
        </p>
      </div>
      <label class="controls">
        Compare
        <select v-model="group">
          <option value="dimensions">Dimensions</option>
          <option value="difficulties">Difficulty tiers</option>
          <option value="topics">Topics</option>
        </select>
      </label>
    </div>

    <div v-if="result.names.length < 2" class="empty-state"><p>At least two {{ unit }}s are needed.</p></div>

    <template v-else>
      <div v-if="result.studentCount < settings.correlation.minStudents" class="notice notice-info">
        <span>
          Based on {{ result.studentCount }} students. Correlations from fewer than {{ settings.correlation.minStudents }}
          students change a lot when a few students change; read them as indicative.
        </span>
      </div>

      <div class="card-box">
        <h3>Correlation matrix</h3>
        <p class="hint">
          Pearson correlation of mastery percentages, from −1 to +1. Blue is positive, orange is negative; hover a cell for
          the number of students behind it. Select a cell to see the scatter.
        </p>
        <div class="table-responsive">
          <table class="matrix">
            <thead>
              <tr>
                <th></th>
                <th v-for="name in result.names" :key="name">{{ name }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(rowName, i) in result.names" :key="rowName">
                <td><strong>{{ rowName }}</strong></td>
                <td
                  v-for="(colName, j) in result.names"
                  :key="colName"
                  class="matrix-cell corr-cell"
                  :class="{ selected: i !== j && isSelected(rowName, colName) }"
                  :style="shade(result.matrix[i][j])"
                  :title="`${rowName} / ${colName}: r = ${result.matrix[i][j] ?? '—'} (${result.counts[i][j]} students)`"
                  @click="i !== j && select(rowName, colName)"
                >
                  <span class="matrix-pct">{{ result.matrix[i][j] == null ? '—' : result.matrix[i][j].toFixed(2) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="hint">
          Marks of a question with several {{ unit }}s are shared between them, so related {{ unit }}s can correlate partly
          because they draw on the same questions.
        </p>
      </div>

      <div class="card-box">
        <h3>Pairs, strongest first</h3>
        <DataTable :columns="pairColumns" :rows="pairRows" row-key="key" clickable export-name="correlation-pairs" @row-click="select($event.a, $event.b)" />
      </div>

      <div v-if="selected" class="card-box">
        <h3>{{ selected.a }} vs {{ selected.b }}</h3>
        <p class="hint">
          One point per student ({{ points.length }}). r = {{ selectedPair?.r ?? '—' }}
          <VerdictTag :verdict="V.correlationVerdict(selectedPair?.r, settings)" />
        </p>
        <ScatterChart :points="points" :x-label="`${selected.a} mastery (%)`" :y-label="`${selected.b} mastery (%)`" />
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, inject, ref, watch } from 'vue'
import DataTable from '../components/DataTable.vue'
import VerdictTag from '../components/VerdictTag.vue'
import ScatterChart from '../components/ScatterChart.vue'
import { correlationMatrix, scatterPoints } from '../lib/correlations.js'
import * as V from '../lib/verdicts.js'
import { formatNumber as num } from '../lib/format.js'

defineEmits(['open-student'])

const exam = inject('exam')
const settings = inject('settings')

const group = ref('dimensions')
const unit = computed(() => ({ dimensions: 'dimension', difficulties: 'tier', topics: 'topic' })[group.value])
const result = computed(() => correlationMatrix(exam.value.profiles, group.value))

// Diverging shade: blue for positive, orange for negative, strength by |r|.
const shade = (r) => {
  if (r == null) return {}
  const alpha = (0.08 + 0.6 * Math.abs(r)).toFixed(3)
  return { backgroundColor: r >= 0 ? `rgba(37, 99, 235, ${alpha})` : `rgba(234, 88, 12, ${alpha})` }
}

const pairRows = computed(() => result.value.pairs.map((p) => ({ ...p, key: `${p.a}|${p.b}` })))
const pairColumns = [
  { key: 'a', label: 'First', type: 'text' },
  { key: 'b', label: 'Second', type: 'text' },
  { key: 'r', label: 'Correlation (r)', type: 'number', format: (v) => num(v, 2) },
  { key: 'strength', label: 'Strength', type: 'text', verdict: (p) => V.correlationVerdict(p.r, settings.value) },
  { key: 'n', label: 'Students', type: 'number' },
]

const selected = ref(null)
const select = (a, b) => {
  selected.value = { a, b }
}
const isSelected = (a, b) => selected.value && ((selected.value.a === a && selected.value.b === b) || (selected.value.a === b && selected.value.b === a))
watch(group, () => {
  selected.value = null
})
// Start with the strongest pair so the page is never empty.
watch(result, (r) => {
  if (!selected.value && r.pairs.length) selected.value = { a: r.pairs[0].a, b: r.pairs[0].b }
}, { immediate: true })

const selectedPair = computed(() => (selected.value ? result.value.pairs.find((p) => (p.a === selected.value.a && p.b === selected.value.b) || (p.a === selected.value.b && p.b === selected.value.a)) : null))
const points = computed(() =>
  selected.value
    ? scatterPoints(exam.value.profiles, group.value, selected.value.a, selected.value.b).map((p) => ({ x: p.x, y: p.y, label: `${p.name} (${p.id})` }))
    : []
)
</script>
