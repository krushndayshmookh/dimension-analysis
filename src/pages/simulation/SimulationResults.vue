<template>
  <div class="flex flex-col gap-6">
    <p class="text-xs text-muted-foreground">
      Last run: {{ result.studentCount }} synthetic students · seed {{ result.params.seed }} · ability
      N({{ result.params.abilityMean }}, {{ result.params.abilitySd }}) · discrimination {{ result.params.discrimination }} ·
      {{ result.modes.partialCredit }} partial-credit question(s) ({{ result.params.testCases }} test cases) · guessing floor
      {{ result.params.guessing }} on {{ result.modes.guessing }} question(s) · range from {{ result.bands.runs }} run(s)
    </p>

    <StatGrid>
      <StatCard v-for="s in stats" :key="s.label" :label="s.label">
        {{ pct(s.expectedPct) }} <span class="text-sm font-normal text-muted-foreground">expected</span>
        <template #description>
          <span>actual {{ pct(s.actualPct) }} · gap {{ signed(s.gapPp, ' pp') }}</span>
          <VerdictTag v-if="s.tagged" :verdict="V.gapVerdict(s.gapPp, settings)" />
          <span v-if="s.lowPct != null && result.bands.runs > 1" class="flex w-full flex-wrap items-center gap-1">
            90% range of expected {{ pct(s.lowPct) }} – {{ pct(s.highPct) }}
            <VerdictTag :verdict="{ label: s.withinRange ? 'Actual within range' : 'Actual outside range', tone: s.withinRange ? 'good' : 'warn' }" />
          </span>
        </template>
      </StatCard>
      <StatCard label="Distribution distance" :value="pct(comparison.distributionDistancePct)" description="total variation distance between the decile distributions" />
    </StatGrid>

    <SectionCard title="Score distribution">
      <template #actions><BinModeToggle v-model="mode" /></template>
      <DataTable :columns="binColumns" :rows="highestFirst(mode === 'percentage' ? comparison.decileBins : comparison.markBins)" row-key="label" :searchable="false" export-name="simulation-distribution">
        <template #cell-deltaPp="{ value }">{{ signed(value, ' pp') }}</template>
        <template #cell-bars="{ row }"><PairBar :first="row.expectedPct" :second="row.actualPct" first-label="Expected" second-label="Actual" /></template>
      </DataTable>
    </SectionCard>

    <SectionCard title="Dimensions">
      <DataTable :columns="gapColumns('dimension', 'Dimension')" :rows="comparison.dimensions" row-key="dimension" :searchable="false" export-name="simulation-dimensions">
        <template #cell-dimension="{ value }"><DimensionBadge :dimension="value" /></template>
        <template #cell-gapPp="{ value }">{{ signed(value, ' pp') }}</template>
        <template #cell-bars="{ row }"><PairBar :first="row.expectedMasteryPct" :second="row.actualMasteryPct" first-label="Expected" second-label="Actual" :color="dimensionColor(row.dimension)" /></template>
      </DataTable>
    </SectionCard>

    <SectionCard v-if="comparison.topics.length" title="Topics">
      <DataTable :columns="gapColumns('topic', 'Topic')" :rows="comparison.topics" row-key="topic" export-name="simulation-topics">
        <template #cell-gapPp="{ value }">{{ signed(value, ' pp') }}</template>
        <template #cell-bars="{ row }"><PairBar :first="row.expectedMasteryPct" :second="row.actualMasteryPct" first-label="Expected" second-label="Actual" /></template>
      </DataTable>
    </SectionCard>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import BinModeToggle from '@/components/display/BinModeToggle.vue'
import DataTable from '@/components/display/DataTable.vue'
import PairBar from '@/components/display/PairBar.vue'
import VerdictTag from '@/components/display/VerdictTag.vue'
import DimensionBadge from '@/components/common/DimensionBadge.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import StatCard from '@/components/common/StatCard.vue'
import StatGrid from '@/components/common/StatGrid.vue'
import { dimensionColor } from '@/lib/colors.js'
import { formatNumber as num, formatPct as pct, formatSigned as signed } from '@/lib/format.js'
import { highestFirst } from '@/lib/stats.js'
import * as V from '@/lib/verdicts.js'
import { useSettingsStore } from '@/stores/settings.js'
import { useSimulationStore } from '@/stores/simulation.js'

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
const simulationStore = useSimulationStore()
const { result, comparison } = storeToRefs(simulationStore)

const mode = ref('percentage')

const stats = computed(() => [
  { label: 'Mean', tagged: true, ...comparison.value.mean },
  { label: 'Median', tagged: true, ...comparison.value.median },
  { label: 'Standard deviation (pp)', tagged: false, ...comparison.value.stdDev },
])

// Present only when the simulation ran more than once.
const rangeColumns = [
  { key: 'range', label: 'Expected 90% range', type: 'text', value: (r) => (r.lowPct == null ? null : `${r.lowPct}% – ${r.highPct}%`) },
  {
    key: 'inRange',
    label: 'Actual vs range',
    type: 'text',
    verdict: (r) => (r.withinRange == null ? null : { label: r.withinRange ? 'Within' : 'Outside', tone: r.withinRange ? 'good' : 'warn' }),
  },
]

const binColumns = computed(() => [
  { key: 'label', label: 'Range', type: 'text' },
  { key: 'expectedCount', label: 'Expected students', type: 'number' },
  { key: 'expectedPct', label: 'Expected %', type: 'number', format: (v) => pct(v) },
  { key: 'actualCount', label: 'Actual students', type: 'number' },
  { key: 'actualPct', label: 'Actual %', type: 'number', format: (v) => pct(v) },
  { key: 'deltaPp', label: 'Actual − expected', type: 'number' },
  { key: 'gapLevel', label: 'Level', type: 'text', verdict: (r) => V.gapVerdict(r.deltaPp, settings.value) },
  ...rangeColumns,
  { key: 'bars', label: 'Expected / actual', type: 'number', value: (r) => r.actualPct, filterable: false, sortable: false, exportable: false },
])

const gapColumns = (key, label) => [
  { key, label, type: 'text' },
  { key: 'availableMarks', label: 'Marks', type: 'number', format: (v) => num(v) },
  { key: 'expectedMasteryPct', label: 'Expected mastery', type: 'number', format: (v) => pct(v) },
  { key: 'actualMasteryPct', label: 'Actual mastery', type: 'number', format: (v) => pct(v) },
  { key: 'gapPp', label: 'Actual − expected', type: 'number' },
  { key: 'gapLevel', label: 'Level', type: 'text', verdict: (r) => V.gapVerdict(r.gapPp, settings.value) },
  ...rangeColumns,
  { key: 'bars', label: 'Expected / actual', type: 'number', value: (r) => r.actualMasteryPct, filterable: false, sortable: false, exportable: false },
]
</script>
