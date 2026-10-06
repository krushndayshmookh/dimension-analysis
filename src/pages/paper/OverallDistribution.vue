<template>
  <SectionCard title="Overall score distribution">
    <template #actions>
      <BinModeToggle v-model="mode" />
      <LearnMore topic="overall" />
    </template>
    <StatGrid compact>
      <StatCard label="Total marks" :value="num(paper.overall.totalMarks)" />
      <StatCard label="Mean" :value="pct(paper.overall.pct.mean)" :description="`${num(paper.overall.earned.mean)} marks`" />
      <StatCard label="Median" :value="pct(paper.overall.pct.median)" :description="`${num(paper.overall.earned.median)} marks`" />
      <StatCard label="Min" :value="pct(paper.overall.pct.min)" />
      <StatCard label="Max" :value="pct(paper.overall.pct.max)" />
      <StatCard label="Std deviation" :value="`${num(paper.overall.pct.stdDev)} pp`" />
    </StatGrid>
    <DataTable :columns="distributionColumns(mode)" :rows="rows" row-key="label" :searchable="false" export-name="overall-distribution">
      <template #cell-bar="{ row }"><Bar :value="row.percentage" /></template>
      <template #cell-students="{ row }"><StudentChips :students="row.students" @select="openStudent" /></template>
    </DataTable>
  </SectionCard>
</template>

<script setup>
import LearnMore from '@/components/common/LearnMore.vue'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import Bar from '@/components/display/Bar.vue'
import BinModeToggle from '@/components/display/BinModeToggle.vue'
import DataTable from '@/components/display/DataTable.vue'
import StudentChips from '@/components/display/StudentChips.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import StatCard from '@/components/common/StatCard.vue'
import StatGrid from '@/components/common/StatGrid.vue'
import { distributionColumns, distributionRows } from '@/lib/distribution.js'
import { formatNumber as num, formatPct as pct } from '@/lib/format.js'
import { useSessionStore } from '@/stores/session.js'

const sessionStore = useSessionStore()
const { paper, profiles } = storeToRefs(sessionStore)
const { openStudent } = sessionStore
const mode = ref('percentage')

const studentById = computed(() => new Map(profiles.value.students.map((s) => [s.id, s])))
const rows = computed(() =>
  distributionRows(paper.value.overall, mode.value, studentById.value, (s) => (mode.value === 'percentage' ? pct(s.masteryPct) : `${num(s.earned)} marks`))
)
</script>
