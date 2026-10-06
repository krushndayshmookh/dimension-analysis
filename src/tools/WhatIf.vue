<template>
  <div class="flex flex-col gap-6">
    <PageHeader
      title="What-if adjustments"
      description="Try rescoring questions and see what would change, before deciding anything. Nothing here is saved or changes the exam."
    >
      <template #actions><Button variant="outline" :disabled="!activeCount" @click="reset">Reset all</Button></template>
    </PageHeader>

    <SectionCard title="Adjust questions">
      <template #description>
        <strong>Drop</strong> removes the question from the paper (total marks fall). <strong>Full marks to everyone</strong>
        awards every student the question's marks, including blanks. <strong>Full marks to those who attempted</strong> leaves
        blanks blank.
      </template>
      <DataTable :columns="questionColumns" :rows="questionRows" row-key="id" export-name="what-if-questions">
        <template #cell-action="{ row }">
          <SelectField :model-value="adjustments[row.id] ?? 'none'" :options="actionOptions" :aria-label="`Adjustment for ${row.id}`" trigger-class="w-56" @update:model-value="(v) => setAction(row.id, v)" />
        </template>
        <template #cell-flags="{ row }"><ReasonTags :reasons="row.flags" /></template>
      </DataTable>
    </SectionCard>

    <NoticeAlert v-if="error" kind="error">{{ error }}</NoticeAlert>
    <EmptyState v-else-if="!activeCount">Choose an adjustment above to see its effect.</EmptyState>

    <template v-else-if="scenario">
      <StatGrid>
        <StatCard v-for="c in changeCards" :key="c.label" :label="c.label" :value="`${c.before} → ${c.after}`">
          <template #description>{{ c.change }} <VerdictTag v-if="c.verdict" :verdict="c.verdict" /></template>
        </StatCard>
        <StatCard :label="`Crossing the pass mark (${settings.attainment.passMark}%)`" :value="`+${crossing.gained} / −${crossing.lost}`" description="students gaining / losing a pass" />
      </StatGrid>

      <SectionCard title="Score distribution" description="Share of students in each decile of mastery, before and after.">
        <LineChart
          :labels="scenario.summary.decileShare.map((b) => b.label)"
          :series="[
            { label: 'Before', data: scenario.summary.decileShare.map((b) => b.basePct), color: '#94a3b8' },
            { label: 'After', data: scenario.summary.decileShare.map((b) => b.adjustedPct), color: '#2563eb' },
          ]"
          y-label="% of students"
        />
      </SectionCard>

      <SectionCard title="Students" description="Rank change is positive when the student moves up. Pass and distinction marks come from Settings.">
        <DataTable
          :columns="studentColumns"
          :rows="scenario.students"
          row-key="id"
          clickable
          :default-sort="{ key: 'deltaPp', dir: 'desc' }"
          export-name="what-if-students"
          @row-click="openStudent($event.id)"
        />
      </SectionCard>
    </template>
  </div>
</template>

<script setup>
import PageHeader from '@/components/common/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import StatCard from '@/components/common/StatCard.vue'
import StatGrid from '@/components/common/StatGrid.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { Button } from '@/components/ui/button'
import NoticeAlert from '@/components/common/NoticeAlert.vue'
import SelectField from '@/components/common/SelectField.vue'
import ReasonTags from '@/components/display/ReasonTags.vue'
import LineChart from '@/components/charts/LineChart.vue'
import { storeToRefs } from 'pinia'
import { useSessionStore } from '@/stores/session.js'
import { useSettingsStore } from '@/stores/settings.js'
import { computed, reactive } from 'vue'
import DataTable from '@/components/display/DataTable.vue'
import VerdictTag from '@/components/display/VerdictTag.vue'
import { runScenario } from '@/lib/whatif.js'
import { analyzeAttempts, buildReviewQueue } from '@/lib/review.js'
import { findReuse } from '@/lib/reuse.js'
import * as V from '@/lib/verdicts.js'
import { formatNumber as num, formatPct as pct, formatSigned as signed } from '@/lib/format.js'

const sessionStore = useSessionStore()
const { exam, savedExams } = storeToRefs(sessionStore)
const { openStudent } = sessionStore
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)


const actionOptions = [
  { value: 'none', label: 'No change' },
  { value: 'drop', label: 'Drop the question' },
  { value: 'full-all', label: 'Full marks to everyone' },
  { value: 'full-attempted', label: 'Full marks to those who attempted' },
]
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
