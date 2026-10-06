<template>
  <div class="flex flex-col gap-6">
    <PageHeader
      title="Question review"
      description="Which questions deserve a second look, whether they were used before, and how students attempted them. Thresholds are set in Settings."
    />

    <StatGrid>
      <StatCard label="Questions to review" :value="`${queue.length} / ${rows.length}`" description="with at least one reason below" />
      <StatCard
        label="Reused from earlier exams"
        :value="`${reuseTotals.reusedCount} / ${reuseTotals.questionCount}`"
        :description="`${pct(reuseTotals.reusedPct)} · ${reuseTotals.examCount} earlier exam${reuseTotals.examCount === 1 ? '' : 's'}`"
      />
      <StatCard
        label="Average attempt rate (students)"
        :value="pct(attempts.totals.meanStudentAttemptRatePct)"
        :description="`share of questions a student attempted${attempts.totals.absentCount ? ` · ${attempts.totals.absentCount} absent student(s) left out` : ''}`"
      />
      <StatCard label="Marks left unattempted" :value="pct(attempts.totals.skippedMarksPct)" :description="`${num(attempts.totals.skippedMarks)} marks across all students`" />
      <StatCard label="Reliability (Cronbach's alpha)" :value="num(paper.reliability.alpha, 2)">
        <template #description><VerdictTag :verdict="V.reliabilityVerdict(paper.reliability.alpha, settings)" /></template>
      </StatCard>
    </StatGrid>

    <SectionCard title="Review queue" description="Most severe first. Severity adds up the reasons; negative discrimination and a high deviation weigh most.">
      <DataTable :columns="queueColumns" :rows="queueRows" row-key="id" export-name="question-review-queue" empty-text="No question has a reason to be reviewed.">
        <template #cell-reasons="{ row }"><ReasonTags :reasons="row.reasons" /></template>
      </DataTable>
    </SectionCard>

    <SectionCard
      title="Reuse across exams"
      description="A question counts as reused when an earlier saved exam has a question with the same type and id. Keep question ids stable across exams for this to work."
    >
      <DataTable
        :columns="reuseColumns"
        :rows="reuseRows"
        row-key="key"
        export-name="question-reuse"
        :empty-text="otherExamsWithData ? 'No question in this exam appeared in an earlier saved exam.' : 'No other saved exam has question data yet.'"
      >
        <template #cell-changePp="{ value }">{{ signed(value, ' pp') }}</template>
      </DataTable>
    </SectionCard>

    <SectionCard
      title="Attempt behaviour"
      description="A question is unattempted when its score cell is blank. “Skippers vs attempters” compares the overall mastery of students who left the question blank with those who attempted it."
    >
      <LineChart
        :labels="rows.map((r) => r.id)"
        :series="[
          { label: 'Attempted by (%)', data: attempts.questions.map((q) => q.attemptRatePct), color: '#2563eb' },
          { label: 'Solved by (%)', data: rows.map((r) => r.solveRatePct), color: '#16a34a' },
        ]"
        y-label="% of students, in paper order"
      />
      <DataTable :columns="attemptColumns" :rows="attempts.questions" row-key="id" export-name="question-attempts" />
      <h4 class="text-sm font-semibold">Students who left questions blank</h4>
      <DataTable
        :columns="skipperColumns"
        :rows="skippingStudents"
        row-key="id"
        clickable
        export-name="students-skipping"
        empty-text="Every student attempted every question."
        @row-click="openStudent($event.id)"
      />
    </SectionCard>

    <SectionCard title="Charts">
      <div class="grid gap-6 lg:grid-cols-2">
        <div class="flex flex-col gap-1">
          <h4 class="text-sm font-semibold">Expected vs actual solve rate</h4>
          <p class="text-xs text-muted-foreground">Points on the dashed line behaved as expected; above it the question was easier than expected.</p>
          <ScatterChart :points="expectedActualPoints" x-label="Expected solve rate (%)" y-label="Actual solve rate (%)" diagonal />
        </div>
        <div class="flex flex-col gap-1">
          <h4 class="text-sm font-semibold">Solve rate vs discrimination</h4>
          <p class="text-xs text-muted-foreground">Discrimination below zero means weaker students did better than stronger ones.</p>
          <ScatterChart :points="discriminationPoints" x-label="Solve rate (%)" y-label="Discrimination index" :y-min="-1" :y-max="1" />
        </div>
      </div>
    </SectionCard>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import ReasonTags from '@/components/display/ReasonTags.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import StatCard from '@/components/common/StatCard.vue'
import StatGrid from '@/components/common/StatGrid.vue'
import DataTable from '@/components/display/DataTable.vue'
import VerdictTag from '@/components/display/VerdictTag.vue'
import LineChart from '@/components/charts/LineChart.vue'
import ScatterChart from '@/components/charts/ScatterChart.vue'
import { analyzeAttempts, buildReviewQueue } from '@/lib/review.js'
import { findReuse, reuseSummary } from '@/lib/reuse.js'
import * as V from '@/lib/verdicts.js'
import { useSessionStore } from '@/stores/session.js'
import { useSettingsStore } from '@/stores/settings.js'
import { formatNumber as num, formatPct as pct, formatSigned as signed } from '@/lib/format.js'

const sessionStore = useSessionStore()
const { exam, savedExams } = storeToRefs(sessionStore)
const { openStudent } = sessionStore
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const paper = computed(() => exam.value.paper)
const rows = computed(() => paper.value.questions.rows)
const attempts = computed(() => analyzeAttempts(exam.value.dataset, exam.value.profiles))
const reuse = computed(() => findReuse(exam.value.id, exam.value.dataset.questions, savedExams.value))
const reuseTotals = computed(() => reuseSummary(rows.value.length, reuse.value))
const otherExamsWithData = computed(() =>
  savedExams.value.some((e) => e.id !== exam.value.id && (e.questionSummaries ?? []).length)
)

const queue = computed(() =>
  buildReviewQueue({ rows: rows.value, reliability: paper.value.reliability, reuse: reuse.value, settings: settings.value })
)
const rowById = computed(() => new Map(rows.value.map((r) => [r.id, r])))

const queueRows = computed(() =>
  queue.value.map((entry) => {
    const r = rowById.value.get(entry.id)
    return {
      id: entry.id,
      type: entry.type,
      position: entry.position,
      severity: entry.severity,
      reasons: entry.reasons,
      solveRatePct: r.solveRatePct,
      deviationPct: r.deviationPct,
      discriminationIndex: r.discriminationIndex,
      attemptRatePct: r.attemptRatePct,
    }
  })
)
const queueColumns = [
  { key: 'position', label: '#', type: 'number' },
  { key: 'id', label: 'Question', type: 'text' },
  { key: 'type', label: 'Type', type: 'text' },
  { key: 'severity', label: 'Severity', type: 'number' },
  { key: 'reasons', label: 'Reasons', type: 'text', value: (r) => r.reasons.map((x) => x.label) },
  { key: 'solveRatePct', label: 'Solved by', type: 'number', format: (v) => pct(v) },
  { key: 'deviationPct', label: 'Deviation', type: 'number', format: (v) => signed(v, ' pp') },
  { key: 'discriminationIndex', label: 'Discrimination', type: 'number', format: (v) => num(v, 2) },
  { key: 'attemptRatePct', label: 'Attempted by', type: 'number', format: (v) => pct(v) },
]

const reuseRows = computed(() =>
  Object.entries(reuse.value).flatMap(([id, appearances]) => {
    const current = rowById.value.get(id)
    return appearances.map((a) => ({
      key: `${id}|${a.examId}`,
      id,
      type: current.type,
      examTitle: a.examTitle,
      courseName: a.courseName,
      examDate: a.examDate,
      studentCount: a.studentCount,
      earlierSolveRatePct: a.solveRatePct,
      currentSolveRatePct: current.solveRatePct,
      changePp: a.solveRatePct == null || current.solveRatePct == null ? null : Math.round((current.solveRatePct - a.solveRatePct) * 100) / 100,
      earlierDiscrimination: a.discriminationIndex,
      currentDiscrimination: current.discriminationIndex,
    }))
  })
)
const reuseColumns = [
  { key: 'id', label: 'Question', type: 'text' },
  { key: 'type', label: 'Type', type: 'text' },
  { key: 'examTitle', label: 'Earlier exam', type: 'text' },
  { key: 'courseName', label: 'Course', type: 'text' },
  { key: 'examDate', label: 'Date', type: 'text' },
  { key: 'studentCount', label: 'Students then', type: 'number' },
  { key: 'earlierSolveRatePct', label: 'Solved by then', type: 'number', format: (v) => pct(v) },
  { key: 'currentSolveRatePct', label: 'Solved by now', type: 'number', format: (v) => pct(v) },
  { key: 'changePp', label: 'Change', type: 'number' },
  { key: 'earlierDiscrimination', label: 'Discrimination then', type: 'number', format: (v) => num(v, 2) },
  { key: 'currentDiscrimination', label: 'Discrimination now', type: 'number', format: (v) => num(v, 2) },
]

const attemptColumns = [
  { key: 'position', label: '#', type: 'number' },
  { key: 'id', label: 'Question', type: 'text' },
  { key: 'attemptedCount', label: 'Attempted', type: 'number' },
  { key: 'skippedCount', label: 'Blank', type: 'number' },
  { key: 'attemptRatePct', label: 'Attempted by', type: 'number', format: (v) => pct(v) },
  { key: 'zeroCount', label: 'Scored 0', type: 'number' },
  { key: 'partialCount', label: 'Partial marks', type: 'number' },
  { key: 'fullCount', label: 'Full marks', type: 'number' },
  { key: 'zeroRateOfAttemptedPct', label: 'Zero among attempts', type: 'number', format: (v) => pct(v) },
  { key: 'skipperMeanMasteryPct', label: 'Skippers’ mastery', type: 'number', format: (v) => pct(v) },
  { key: 'attempterMeanMasteryPct', label: 'Attempters’ mastery', type: 'number', format: (v) => pct(v) },
  { key: 'attempterMinusSkipperPp', label: 'Attempters − skippers', type: 'number', format: (v) => signed(v, ' pp') },
]

const skippingStudents = computed(() => attempts.value.students.filter((s) => s.skippedCount > 0))
const skipperColumns = [
  { key: 'id', label: 'ID', type: 'text' },
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'section', label: 'Section', type: 'text' },
  { key: 'skippedCount', label: 'Questions blank', type: 'number' },
  { key: 'skippedIds', label: 'Not attempted', type: 'text' },
  { key: 'attemptRatePct', label: 'Attempt rate', type: 'number', format: (v) => pct(v) },
  { key: 'skippedMarks', label: 'Marks left', type: 'number', format: (v) => num(v) },
  { key: 'skippedMarksPct', label: '% of exam marks', type: 'number', format: (v) => pct(v) },
]

// Point colors follow the verdict tones, or a single color when verdicts are off.
const TONE_COLORS = { good: '#16a34a', warn: '#eab308', bad: '#dc2626', info: '#2563eb', neutral: '#64748b' }
const colorFor = (verdict) => (settings.value.showVerdicts && verdict ? TONE_COLORS[verdict.tone] : '#2563eb')

const expectedActualPoints = computed(() =>
  rows.value
    .filter((r) => r.solveRatePct != null)
    .map((r) => ({ x: r.expectedSolveRatePct, y: r.solveRatePct, label: r.id, color: colorFor(V.deviationVerdict(r.deviationPct, settings.value)) }))
)
const discriminationPoints = computed(() =>
  rows.value
    .filter((r) => r.solveRatePct != null && r.discriminationIndex != null)
    .map((r) => ({ x: r.solveRatePct, y: r.discriminationIndex, label: r.id, color: colorFor(V.discriminationVerdict(r.discriminationIndex, settings.value)) }))
)
</script>
