<template>
  <SectionCard title="Score distribution by dimension">
    <template #actions>
      <BinModeToggle v-model="mode" />
      <SelectField v-model="selected" :options="choices" aria-label="Dimension" trigger-class="w-40" />
    </template>
    <div v-for="dist in visible" :key="dist.dimension" class="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3">
      <div class="flex items-center gap-2">
        <DimensionBadge :dimension="dist.dimension" />
        <VerdictTag :verdict="V.masteryVerdict(dist.pct.mean, settings)" />
      </div>
      <p class="text-xs text-muted-foreground">
        {{ num(dist.availableMarks) }} marks · {{ dist.questionCount }} questions · mean {{ pct(dist.pct.mean) }} · median
        {{ pct(dist.pct.median) }} · min {{ pct(dist.pct.min) }} · max {{ pct(dist.pct.max) }} · std dev {{ num(dist.pct.stdDev) }} pp
      </p>
      <DataTable
        :columns="distributionColumns(mode)"
        :rows="rowsFor(dist)"
        row-key="label"
        :searchable="false"
        :export-name="`distribution-${dist.dimension.toLowerCase()}`"
      >
        <template #cell-bar="{ row }"><Bar :value="row.percentage" :color="dimensionColor(dist.dimension)" /></template>
        <template #cell-students="{ row }"><StudentChips :students="row.students" @select="openStudent" /></template>
      </DataTable>
    </div>
  </SectionCard>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import Bar from '@/components/data/Bar.vue'
import BinModeToggle from '@/components/data/BinModeToggle.vue'
import DataTable from '@/components/data/DataTable.vue'
import StudentChips from '@/components/data/StudentChips.vue'
import VerdictTag from '@/components/data/VerdictTag.vue'
import DimensionBadge from '@/components/common/DimensionBadge.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import SelectField from '@/components/common/SelectField.vue'
import { dimensionColor } from '@/lib/colors.js'
import { distributionColumns, distributionRows } from '@/lib/distribution.js'
import { formatNumber as num, formatPct as pct } from '@/lib/format.js'
import * as V from '@/lib/verdicts.js'
import { useSessionStore } from '@/stores/session.js'
import { useSettingsStore } from '@/stores/settings.js'

const sessionStore = useSessionStore()
const { paper, profiles } = storeToRefs(sessionStore)
const { openStudent } = sessionStore
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const mode = ref('percentage')
const selected = ref('all')
const choices = computed(() => [{ value: 'all', label: 'All dimensions' }, ...profiles.value.dimensions.map((d) => ({ value: d, label: d }))])
const visible = computed(() => paper.value.dimensions.filter((d) => selected.value === 'all' || d.dimension === selected.value))

const studentById = computed(() => new Map(profiles.value.students.map((s) => [s.id, s])))
const rowsFor = (dist) =>
  distributionRows(dist, mode.value, studentById.value, (s) => {
    const b = s.dimensions[dist.dimension]
    return mode.value === 'percentage' ? pct(b.masteryPct) : `${num(b.earned)} marks`
  })
</script>
