<template>
  <SectionCard v-if="paper.quartiles" title="Top and bottom quarter of students">
    <template #description>
      Mean mastery of the {{ paper.quartiles.groupSize }} highest and {{ paper.quartiles.groupSize }} lowest scoring students
      overall. A large separation means that dimension or tier sets the strong students apart.
    </template>
    <DataTable :columns="columns('Dimension')" :rows="paper.quartiles.dimensions" row-key="dimension" :searchable="false" export-name="quartiles-dimensions">
      <template #cell-dimension="{ value }"><DimensionBadge :dimension="value" /></template>
      <template #cell-bars="{ row }"><PairBar :first="row.bottomMeanPct" :second="row.topMeanPct" first-label="Bottom" second-label="Top" :color="dimensionColor(row.dimension)" /></template>
    </DataTable>
    <DataTable :columns="columns('Tier')" :rows="paper.quartiles.difficulties" row-key="difficulty" :searchable="false" export-name="quartiles-tiers">
      <template #cell-difficulty="{ value }"><TierBadge :tier="value" /></template>
      <template #cell-bars="{ row }"><PairBar :first="row.bottomMeanPct" :second="row.topMeanPct" first-label="Bottom" second-label="Top" /></template>
    </DataTable>
  </SectionCard>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import DataTable from '@/components/display/DataTable.vue'
import PairBar from '@/components/display/PairBar.vue'
import DimensionBadge from '@/components/common/DimensionBadge.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import TierBadge from '@/components/common/TierBadge.vue'
import { dimensionColor } from '@/lib/colors.js'
import { formatPct as pct, formatSigned as signed } from '@/lib/format.js'
import { useSessionStore } from '@/stores/session.js'

const sessionStore = useSessionStore()
const { paper } = storeToRefs(sessionStore)

const columns = (label) => [
  { key: label === 'Dimension' ? 'dimension' : 'difficulty', label, type: 'text' },
  { key: 'topMeanPct', label: 'Top quarter mean', type: 'number', format: (v) => pct(v) },
  { key: 'bottomMeanPct', label: 'Bottom quarter mean', type: 'number', format: (v) => pct(v) },
  { key: 'separationPp', label: 'Separation', type: 'number', format: (v) => signed(v, ' pp') },
  { key: 'bars', label: 'Bottom / top', type: 'number', value: (r) => r.topMeanPct, filterable: false, sortable: false, exportable: false },
]
</script>
