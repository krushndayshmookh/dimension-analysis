<template>
  <SectionCard title="Difficulty tiers">
    <DataTable :columns="tierColumns" :rows="tierRows" row-key="difficulty" :searchable="false" export-name="difficulty-tiers">
      <template #cell-difficulty="{ value }"><TierBadge :tier="value" /></template>
      <template #cell-bar="{ row }"><Bar :value="row.meanPct" /></template>
    </DataTable>
    <div>
      <h4 class="text-sm font-semibold">Tier order</h4>
      <p class="text-xs text-muted-foreground">Each tier compared with the next easier tier that has questions. Change = harder tier mean minus easier tier mean.</p>
    </div>
    <DataTable :columns="progressionColumns" :rows="progressionRows" row-key="harder" :searchable="false" export-name="tier-order">
      <template #cell-easier="{ value }"><TierBadge :tier="value" /></template>
      <template #cell-harder="{ value }"><TierBadge :tier="value" /></template>
    </DataTable>
  </SectionCard>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import Bar from '@/components/data/Bar.vue'
import DataTable from '@/components/data/DataTable.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import TierBadge from '@/components/common/TierBadge.vue'
import { formatNumber as num, formatPct as pct, formatSigned as signed } from '@/lib/format.js'
import * as V from '@/lib/verdicts.js'
import { useSessionStore } from '@/stores/session.js'
import { useSettingsStore } from '@/stores/settings.js'

const sessionStore = useSessionStore()
const { paper } = storeToRefs(sessionStore)
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const tierRows = computed(() =>
  paper.value.difficulties.map((t) => ({
    difficulty: t.difficulty,
    questionCount: t.questionCount,
    availableMarks: t.availableMarks,
    shareOfExamPct: t.shareOfExamPct,
    meanPct: t.pct.mean,
    medianPct: t.pct.median,
    minPct: t.pct.min,
    maxPct: t.pct.max,
    stdDevPct: t.pct.stdDev,
  }))
)
const tierColumns = [
  { key: 'difficulty', label: 'Tier', type: 'text' },
  { key: 'questionCount', label: 'Questions', type: 'number' },
  { key: 'availableMarks', label: 'Marks', type: 'number', format: (v) => num(v) },
  { key: 'shareOfExamPct', label: '% of exam', type: 'number', format: (v) => pct(v) },
  { key: 'meanPct', label: 'Mean mastery', type: 'number', format: (v) => pct(v) },
  { key: 'level', label: 'Level', type: 'text', verdict: (r) => V.masteryVerdict(r.meanPct, settings.value) },
  { key: 'medianPct', label: 'Median', type: 'number', format: (v) => pct(v) },
  { key: 'minPct', label: 'Min', type: 'number', format: (v) => pct(v) },
  { key: 'maxPct', label: 'Max', type: 'number', format: (v) => pct(v) },
  { key: 'stdDevPct', label: 'Std dev (pp)', type: 'number', format: (v) => num(v) },
  { key: 'bar', label: 'Mean mastery', type: 'number', value: (r) => r.meanPct, filterable: false, sortable: false, exportable: false },
]

// Tier order: each tier against the next easier tier that has questions.
const progressionRows = computed(() => V.tierProgression(paper.value.difficulties, settings.value))
const progressionColumns = [
  { key: 'easier', label: 'Easier tier', type: 'text' },
  { key: 'harder', label: 'Harder tier', type: 'text' },
  { key: 'easierMeanPct', label: 'Easier mean', type: 'number', format: (v) => pct(v) },
  { key: 'harderMeanPct', label: 'Harder mean', type: 'number', format: (v) => pct(v) },
  { key: 'changePp', label: 'Change', type: 'number', format: (v) => signed(v, ' pp') },
  {
    key: 'status',
    label: 'Order',
    type: 'text',
    verdict: (r) => (r.inverted ? { label: 'Out of order', tone: 'warn' } : { label: 'In order', tone: 'good' }),
  },
]
</script>
