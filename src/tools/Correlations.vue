<template>
  <div class="flex flex-col gap-6">
    <PageHeader
      title="Correlations"
      :description="`How students' mastery in one ${unit} relates to their mastery in another. A positive coefficient means students who do well in one tend to do well in the other.`"
    >
      <template #actions>
        <SelectField v-model="group" :options="groupOptions" aria-label="Compare" trigger-class="w-44" />
      </template>
    </PageHeader>

    <EmptyState v-if="result.names.length < 2">At least two {{ unit }}s are needed.</EmptyState>

    <template v-else>
      <NoticeAlert v-if="result.studentCount < settings.correlation.minStudents" kind="info">
        Based on {{ result.studentCount }} students. Correlations from fewer than {{ settings.correlation.minStudents }} students
        change a lot when a few students change; read them as indicative.
      </NoticeAlert>

      <SectionCard title="Correlation matrix">
        <template #description>
          Pearson correlation of mastery percentages, from −1 to +1. Blue is positive, orange is negative; hover a cell for the
          number of students behind it. Select a cell to see the scatter.
        </template>
        <div class="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead v-for="name in result.names" :key="name" class="text-center">{{ name }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="(rowName, i) in result.names" :key="rowName">
                <TableCell class="font-medium">{{ rowName }}</TableCell>
                <TableCell
                  v-for="(colName, j) in result.names"
                  :key="colName"
                  class="min-w-20 cursor-pointer text-center tabular-nums"
                  :class="i !== j && isSelected(rowName, colName) ? 'outline-2 -outline-offset-2 outline-foreground' : ''"
                  :style="shade(result.matrix[i][j])"
                  :title="`${rowName} / ${colName}: r = ${result.matrix[i][j] ?? '—'} (${result.counts[i][j]} students)`"
                  @click="i !== j && select(rowName, colName)"
                >
                  <span class="font-semibold">{{ result.matrix[i][j] == null ? '—' : result.matrix[i][j].toFixed(2) }}</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <p class="text-xs text-muted-foreground">
          Marks of a question with several {{ unit }}s are shared between them, so related {{ unit }}s can correlate partly because
          they draw on the same questions.
        </p>
      </SectionCard>

      <SectionCard title="Pairs, strongest first">
        <DataTable :columns="pairColumns" :rows="pairRows" row-key="key" clickable export-name="correlation-pairs" @row-click="select($event.a, $event.b)" />
      </SectionCard>

      <SectionCard v-if="selected" :title="`${selected.a} vs ${selected.b}`">
        <template #description>
          One point per student ({{ points.length }}). r = {{ selectedPair?.r ?? '—' }}
          <VerdictTag :verdict="V.correlationVerdict(selectedPair?.r, settings)" />
        </template>
        <ScatterChart :points="points" :x-label="`${selected.a} mastery (%)`" :y-label="`${selected.b} mastery (%)`" />
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
import NoticeAlert from '@/components/common/NoticeAlert.vue'
import SelectField from '@/components/common/SelectField.vue'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { storeToRefs } from 'pinia'
import { useSessionStore } from '@/stores/session.js'
import { useSettingsStore } from '@/stores/settings.js'
import { computed, ref, watch } from 'vue'
import DataTable from '@/components/display/DataTable.vue'
import VerdictTag from '@/components/display/VerdictTag.vue'
import ScatterChart from '@/components/charts/ScatterChart.vue'
import { correlationMatrix, scatterPoints } from '@/lib/correlations.js'
import * as V from '@/lib/verdicts.js'
import { formatNumber as num } from '@/lib/format.js'

const sessionStore = useSessionStore()
const { exam } = storeToRefs(sessionStore)
const { openStudent } = sessionStore
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)


const group = ref('dimensions')
const groupOptions = [
  { value: 'dimensions', label: 'Dimensions' },
  { value: 'difficulties', label: 'Difficulty tiers' },
  { value: 'topics', label: 'Topics' },
]
const unit = computed(() => ({ dimensions: 'dimension', difficulties: 'tier', topics: 'topic' })[group.value])
const result = computed(() => correlationMatrix(exam.value.profiles, group.value))

// Diverging shade: blue for positive, orange for negative, strength by |r|.
const shade = (r) => {
  if (r == null) return {}
  const alpha = (0.08 + 0.6 * Math.abs(r)).toFixed(3)
  return { backgroundColor: r >= 0 ? `rgba(37, 99, 235, ${alpha})` : `rgba(234, 88, 12, ${alpha})` }
}

const pairRows = computed(() => result.value.pairs.map((p) => ({ ...p, key: `${p.a}|${p.b}` })))
const pairColumns = [
  { key: 'a', label: 'First', type: 'text' },
  { key: 'b', label: 'Second', type: 'text' },
  { key: 'r', label: 'Correlation (r)', type: 'number', format: (v) => num(v, 2) },
  { key: 'strength', label: 'Strength', type: 'text', verdict: (p) => V.correlationVerdict(p.r, settings.value) },
  { key: 'n', label: 'Students', type: 'number' },
]

const selected = ref(null)
const select = (a, b) => {
  selected.value = { a, b }
}
const isSelected = (a, b) => selected.value && ((selected.value.a === a && selected.value.b === b) || (selected.value.a === b && selected.value.b === a))
watch(group, () => {
  selected.value = null
})
// Start with the strongest pair so the page is never empty.
watch(result, (r) => {
  if (!selected.value && r.pairs.length) selected.value = { a: r.pairs[0].a, b: r.pairs[0].b }
}, { immediate: true })

const selectedPair = computed(() => (selected.value ? result.value.pairs.find((p) => (p.a === selected.value.a && p.b === selected.value.b) || (p.a === selected.value.b && p.b === selected.value.a)) : null))
const points = computed(() =>
  selected.value
    ? scatterPoints(exam.value.profiles, group.value, selected.value.a, selected.value.b).map((p) => ({ x: p.x, y: p.y, label: `${p.name} (${p.id})` }))
    : []
)
</script>
