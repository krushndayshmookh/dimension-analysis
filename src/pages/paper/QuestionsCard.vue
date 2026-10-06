<template>
  <SectionCard title="Questions: expected and actual solve rate">
    <template #description>
      Solve rate = students who earned full marks ÷ all students. Deviation = actual − expected, in percentage points.
      Expected rates come from <code class="rounded bg-muted px-1">expected_solve_rate</code>; where it is blank the tier
      default is used (marked "difficulty-default"): {{ defaultRateText }}.
    </template>
    <StatGrid compact>
      <StatCard label="Mean absolute deviation" :value="`${num(paper.questions.summary.meanAbsDeviationPct)} pp`" />
      <StatCard label="Questions by deviation level">
        <template #description>
          <span v-for="l in deviationCounts" :key="l.label" class="mr-2 inline-flex items-center gap-1"><VerdictTag :verdict="l" /> {{ l.count }}</span>
        </template>
      </StatCard>
      <StatCard label="Largest negative deviation" :value="paper.questions.summary.largestNegative?.id ?? '—'" :description="signed(paper.questions.summary.largestNegative?.deviationPct, ' pp')" />
      <StatCard label="Largest positive deviation" :value="paper.questions.summary.largestPositive?.id ?? '—'" :description="signed(paper.questions.summary.largestPositive?.deviationPct, ' pp')" />
    </StatGrid>
    <DataTable :columns="columns" :rows="paper.questions.rows" row-key="id" export-name="questions">
      <template #cell-dimensions="{ row }">
        <span class="flex flex-wrap gap-1"><DimensionBadge v-for="d in row.dimensions" :key="d" :dimension="d" /></span>
      </template>
      <template #cell-difficulty="{ value }"><TierBadge :tier="value" /></template>
      <template #cell-deviationPct="{ value }">{{ signed(value, ' pp') }}</template>
      <template #cell-bars="{ row }">
        <PairBar :first="row.expectedSolveRatePct" :second="row.solveRatePct" first-label="Expected" second-label="Actual" />
      </template>
    </DataTable>
  </SectionCard>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import DataTable from '@/components/data/DataTable.vue'
import PairBar from '@/components/data/PairBar.vue'
import VerdictTag from '@/components/data/VerdictTag.vue'
import DimensionBadge from '@/components/common/DimensionBadge.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import StatCard from '@/components/common/StatCard.vue'
import StatGrid from '@/components/common/StatGrid.vue'
import TierBadge from '@/components/common/TierBadge.vue'
import { DEFAULT_EXPECTED_SOLVE_RATES } from '@/lib/constants.js'
import { formatNumber as num, formatPct as pct, formatSigned as signed } from '@/lib/format.js'
import * as V from '@/lib/verdicts.js'
import { useSessionStore } from '@/stores/session.js'
import { useSettingsStore } from '@/stores/settings.js'

const sessionStore = useSessionStore()
const { paper } = storeToRefs(sessionStore)
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const defaultRateText = Object.entries(DEFAULT_EXPECTED_SOLVE_RATES).map(([t, r]) => `${t} ${r}%`).join(', ')

const columns = [
  { key: 'id', label: 'Question', type: 'text' },
  { key: 'type', label: 'Type', type: 'text' },
  { key: 'dimensions', label: 'Dimensions', type: 'text' },
  { key: 'difficulty', label: 'Tier', type: 'text' },
  { key: 'topics', label: 'Topics', type: 'text' },
  { key: 'marks', label: 'Marks', type: 'number', format: (v) => num(v) },
  { key: 'expectedSolveRatePct', label: 'Expected', type: 'number', format: (v) => pct(v) },
  { key: 'expectedSource', label: 'Expected source', type: 'text' },
  { key: 'solveRatePct', label: 'Actual', type: 'number', format: (v) => pct(v) },
  { key: 'solvedCount', label: 'Solved', type: 'number', format: (v, r) => `${v} / ${r.studentCount}` },
  { key: 'attemptedSolveRatePct', label: 'Of attempted', type: 'number', format: (v) => pct(v) },
  { key: 'attemptRatePct', label: 'Attempted by', type: 'number', format: (v) => pct(v) },
  { key: 'meanScorePct', label: 'Mean score', type: 'number', format: (v) => pct(v) },
  { key: 'deviationPct', label: 'Deviation', type: 'number' },
  { key: 'deviationLevel', label: 'Deviation level', type: 'text', verdict: (r) => V.deviationVerdict(r.deviationPct, settings.value) },
  { key: 'discriminationIndex', label: 'Discrimination', type: 'number', format: (v) => num(v, 2) },
  { key: 'discriminationLevel', label: 'Discrimination level', type: 'text', verdict: (r) => V.discriminationVerdict(r.discriminationIndex, settings.value) },
  { key: 'itemRestCorrelation', label: 'Item-rest r', type: 'number', format: (v) => num(v, 2) },
  { key: 'alphaIfRemoved', label: 'Alpha if removed', type: 'number', format: (v) => num(v, 2) },
  { key: 'flags', label: 'Flags', type: 'text', verdict: (r) => V.questionFlags(r, settings.value) },
  { key: 'bars', label: 'Expected / actual', type: 'number', value: (r) => r.solveRatePct, filterable: false, sortable: false, exportable: false },
]

const LEVELS = [
  { level: 'low', label: 'Low', tone: 'good' },
  { level: 'medium', label: 'Medium', tone: 'warn' },
  { level: 'high', label: 'High', tone: 'bad' },
]
const deviationCounts = computed(() =>
  LEVELS.map((l) => ({
    ...l,
    count: paper.value.questions.rows.filter((r) => V.deviationVerdict(r.deviationPct, settings.value)?.level === l.level).length,
  }))
)
</script>
