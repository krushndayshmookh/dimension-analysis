<template>
  <SectionCard title="Share of marks by dimension and tier">
    <template #description>
      Each row's share of the exam's marks.
      <template v-if="hasTargets">Targets and tolerance are set in Settings.</template>
      <template v-else>Set target shares in Settings (Paper blueprint) to compare them with the actual shares.</template>
    </template>
    <DataTable :columns="columns" :rows="rows" row-key="key" :searchable="false" export-name="marks-share">
      <template #cell-name="{ row }">
        <DimensionBadge v-if="row.kind === 'Dimension'" :dimension="row.name" />
        <TierBadge v-else :tier="row.name" />
      </template>
    </DataTable>
  </SectionCard>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import DataTable from '@/components/data/DataTable.vue'
import DimensionBadge from '@/components/common/DimensionBadge.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import TierBadge from '@/components/common/TierBadge.vue'
import { formatPct as pct, formatSigned as signed } from '@/lib/format.js'
import * as V from '@/lib/verdicts.js'
import { useSessionStore } from '@/stores/session.js'
import { useSettingsStore } from '@/stores/settings.js'

const sessionStore = useSessionStore()
const { paper } = storeToRefs(sessionStore)
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

// Share of marks by dimension and tier, against optional targets from Settings.
const rows = computed(() => {
  const target = (group, name) => settings.value.blueprint[group][name] ?? null
  const row = (kind, group, name, actualPct) => ({
    key: `${kind}-${name}`,
    kind,
    name,
    actualPct,
    targetPct: target(group, name),
    diffPp: target(group, name) == null || actualPct == null ? null : Math.round((actualPct - target(group, name)) * 100) / 100,
  })
  return [
    ...paper.value.dimensions.map((d) => row('Dimension', 'dimensions', d.dimension, d.shareOfExamPct)),
    ...paper.value.difficulties.map((d) => row('Tier', 'difficulties', d.difficulty, d.shareOfExamPct)),
  ]
})
const hasTargets = computed(() => rows.value.some((r) => r.targetPct != null))
const columns = [
  { key: 'kind', label: 'Kind', type: 'text' },
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'actualPct', label: 'Actual share', type: 'number', format: (v) => pct(v) },
  { key: 'targetPct', label: 'Target', type: 'number', format: (v) => pct(v) },
  { key: 'diffPp', label: 'Actual − target', type: 'number', format: (v) => signed(v, ' pp') },
  { key: 'status', label: 'Status', type: 'text', verdict: (r) => V.blueprintVerdict(r.actualPct, r.targetPct, settings.value) },
]
</script>
