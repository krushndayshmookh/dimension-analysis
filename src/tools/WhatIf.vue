<template>
  <section class="view-panel">
    <div class="view-header">
      <div>
        <h2 class="view-title">What-if adjustments</h2>
        <p class="view-desc">
          Try rescoring questions and see what would change, before deciding anything. Nothing here is saved or changes
          the exam.
        </p>
      </div>
      <button type="button" class="btn-secondary" :disabled="!activeCount" @click="reset">Reset all</button>
    </div>

    <div class="card-box">
      <h3>Adjust questions</h3>
      <p class="hint">
        <strong>Drop</strong> removes the question from the paper (total marks fall).
        <strong>Full marks to everyone</strong> awards every student the question's marks, including blanks.
        <strong>Full marks to those who attempted</strong> leaves blanks blank.
      </p>
      <DataTable :columns="questionColumns" :rows="questionRows" row-key="id" export-name="what-if-questions">
        <template #cell-action="{ row }">
          <select :value="adjustments[row.id] ?? 'none'" :aria-label="`Adjustment for ${row.id}`" @change="setAction(row.id, $event.target.value)">
            <option value="none">No change</option>
            <option value="drop">Drop the question</option>
            <option value="full-all">Full marks to everyone</option>
            <option value="full-attempted">Full marks to those who attempted</option>
          </select>
        </template>
        <template #cell-flags="{ row }">
          <span v-for="r in row.flags" :key="r.id" class="tag" :class="settings.showVerdicts ? `tag-${r.tone}` : 'tag-neutral'">{{ r.label }}</span>
        </template>
      </DataTable>
    </div>

    <div v-if="error" class="notice notice-error">{{ error }}</div>
    <div v-else-if="!activeCount" class="empty-state"><p>Choose an adjustment above to see its effect.</p></div>

    <template v-else-if="scenario">
      <div class="stat-cards-grid">
        <div v-for="c in changeCards" :key="c.label" class="stat-card">
          <span class="stat-label">{{ c.label }}</span>
          <span class="stat-value">{{ c.before }} → {{ c.after }}</span>
          <span class="stat-desc">{{ c.change }} <VerdictTag v-if="c.verdict" :verdict="c.verdict" /></span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Crossing the pass mark ({{ settings.attainment.passMark }}%)</span>
          <span class="stat-value">+{{ crossing.gained }} / −{{ crossing.lost }}</span>
          <span class="stat-desc">students gaining / losing a pass</span>
        </div>
      </div>

      <div class="card-box">
        <h3>Score distribution</h3>
        <p class="hint">Share of students in each decile of mastery, before and after.</p>
        <LineChart
          :labels="scenario.summary.decileShare.map((b) => b.label)"
          :series="[
            { label: 'Before', data: scenario.summary.decileShare.map((b) => b.basePct), color: '#94a3b8' },
            { label: 'After', data: scenario.summary.decileShare.map((b) => b.adjustedPct), color: '#2563eb' },
          ]"
          y-label="% of students"
        />
      </div>

      <div class="card-box">
        <h3>Students</h3>
        <p class="hint">Rank change is positive when the student moves up. Pass and distinction marks come from Settings.</p>
        <DataTable
          :columns="studentColumns"
          :rows="scenario.students"
          row-key="id"
          clickable
          :default-sort="{ key: 'deltaPp', dir: 'desc' }"
          export-name="what-if-students"
          @row-click="$emit('open-student', $event.id)"
        />
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, inject, reactive } from 'vue'
import DataTable from '../components/DataTable.vue'
import VerdictTag from '../components/VerdictTag.vue'
import LineChart from '../components/charts/LineChart.vue'
import { runScenario } from '../lib/whatif.js'
import { analyzeAttempts, buildReviewQueue } from '../lib/review.js'
import { findReuse } from '../lib/reuse.js'
import * as V from '../lib/verdicts.js'
import { formatNumber as num, formatPct as pct, formatSigned as signed } from '../lib/format.js'

defineEmits(['open-student'])

const exam = inject('exam')
const savedExams = inject('savedExams')
const settings = inject('settings')

const adjustments = reactive({})
const activeCount = computed(() => Object.values(adjustments).filter((a) => a !== 'none').length)
const setAction = (id, action) => {
  if (action === 'none') delete adjustments[id]
  else adjustments[id] = action
}
const reset = () => {
  for (const id of Object.keys(adjustments)) delete adjustments[id]
}

// Question table, with the review queue's reasons as context for what to adjust.
const rows = computed(() => exam.value.paper.questions.rows)
const queueById = computed(() => {
  const reuse = findReuse(exam.value.id, exam.value.dataset.questions, savedExams.value)
  const queue = buildReviewQueue({ rows: rows.value, reliability: exam.value.paper.reliability, reuse, settings: settings.value })
  return new Map(queue.map((q) => [q.id, q.reasons]))
})
const questionRows = computed(() =>
  rows.value.map((r) => ({
    id: r.id,
    type: r.type,
    marks: r.marks,
    solveRatePct: r.solveRatePct,
    deviationPct: r.deviationPct,
    discriminationIndex: r.discriminationIndex,
    flags: queueById.value.get(r.id) ?? [],
    action: adjustments[r.id] ?? 'none',
  }))
)
const questionColumns = [
  { key: 'id', label: 'Question', type: 'text' },
  { key: 'type', label: 'Type', type: 'text' },
  { key: 'marks', label: 'Marks', type: 'number', format: (v) => num(v) },
  { key: 'solveRatePct', label: 'Solved by', type: 'number', format: (v) => pct(v) },
  { key: 'deviationPct', label: 'Deviation', type: 'number', format: (v) => signed(v, ' pp') },
  { key: 'discriminationIndex', label: 'Discrimination', type: 'number', format: (v) => num(v, 2) },
  { key: 'flags', label: 'Review reasons', type: 'text', value: (r) => r.flags.map((f) => f.label) },
  { key: 'action', label: 'Adjustment', type: 'text', value: (r) => r.action },
]

// The rescored analysis, or the reason it cannot be computed (for example every question dropped).
const outcome = computed(() => {
  if (!activeCount.value) return null
  try {
    return { scenario: runScenario(exam.value.dataset, exam.value, { ...adjustments }, settings.value) }
  } catch (err) {
    return { error: err.message }
  }
})
const scenario = computed(() => outcome.value?.scenario ?? null)
const error = computed(() => outcome.value?.error ?? '')

const changeCards = computed(() => {
  const s = scenario.value.summary
  return [
    { label: 'Mean mastery', before: pct(s.mean.basePct), after: pct(s.mean.adjustedPct), change: signed(s.mean.deltaPp, ' pp'), verdict: V.difficultyVerdict(s.mean.adjustedPct, settings.value) },
    { label: 'Median mastery', before: pct(s.median.basePct), after: pct(s.median.adjustedPct), change: signed(s.median.deltaPp, ' pp') },
    { label: 'At or above pass mark', before: `${s.pass.baseCount}`, after: `${s.pass.adjustedCount}`, change: `${pct(s.pass.baseRatePct)} → ${pct(s.pass.adjustedRatePct)}` },
    { label: 'At or above distinction mark', before: `${s.distinction.baseCount}`, after: `${s.distinction.adjustedCount}`, change: `${pct(s.distinction.baseRatePct)} → ${pct(s.distinction.adjustedRatePct)}` },
    { label: 'Reliability (alpha)', before: num(s.reliability.baseAlpha, 2), after: num(s.reliability.adjustedAlpha, 2), change: signed(s.reliability.delta, '', 2), verdict: V.reliabilityVerdict(s.reliability.adjustedAlpha, settings.value) },
    { label: 'Total marks', before: num(s.totalMarks.base), after: num(s.totalMarks.adjusted), change: '' },
  ]
})
const crossing = computed(() => ({
  gained: scenario.value.students.filter((s) => s.passChange === 'gained').length,
  lost: scenario.value.students.filter((s) => s.passChange === 'lost').length,
}))

const CHANGE_LABELS = { gained: { label: 'Gains pass', tone: 'good' }, lost: { label: 'Loses pass', tone: 'bad' } }
const studentColumns = [
  { key: 'id', label: 'ID', type: 'text' },
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'section', label: 'Section', type: 'text' },
  { key: 'basePct', label: 'Before', type: 'number', format: (v) => pct(v) },
  { key: 'adjustedPct', label: 'After', type: 'number', format: (v) => pct(v) },
  { key: 'deltaPp', label: 'Change', type: 'number', format: (v) => signed(v, ' pp') },
  { key: 'baseRank', label: 'Rank before', type: 'number' },
  { key: 'adjustedRank', label: 'Rank after', type: 'number' },
  { key: 'rankChange', label: 'Rank change', type: 'number', format: (v) => signed(v, '', 0) },
  { key: 'pass', label: 'Pass mark', type: 'text', verdict: (r) => CHANGE_LABELS[r.passChange] ?? null },
  { key: 'distinction', label: 'Distinction mark', type: 'text', verdict: (r) => (r.distinctionChange ? { label: r.distinctionChange === 'gained' ? 'Gains distinction' : 'Loses distinction', tone: r.distinctionChange === 'gained' ? 'good' : 'bad' } : null) },
]
</script>
