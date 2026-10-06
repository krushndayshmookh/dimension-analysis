<template>
  <SectionCard title="Topics" description="Marks of a multi-topic question are split equally across its topics.">
    <DataTable :columns="columns" :rows="paper.topics" row-key="topic" :default-sort="{ key: 'topic', dir: 'asc' }" export-name="topics">
      <template #cell-bar="{ row }"><Bar :value="row.masteryPct" /></template>
    </DataTable>
  </SectionCard>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import Bar from '@/components/display/Bar.vue'
import DataTable from '@/components/display/DataTable.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import { formatNumber as num, formatPct as pct } from '@/lib/format.js'
import * as V from '@/lib/verdicts.js'
import { useSessionStore } from '@/stores/session.js'
import { useSettingsStore } from '@/stores/settings.js'

const sessionStore = useSessionStore()
const { paper } = storeToRefs(sessionStore)
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const columns = [
  { key: 'topic', label: 'Topic', type: 'text' },
  { key: 'questionCount', label: 'Questions', type: 'number' },
  { key: 'availableMarks', label: 'Marks', type: 'number', format: (v) => num(v) },
  { key: 'meanEarned', label: 'Avg earned', type: 'number', format: (v) => num(v) },
  { key: 'masteryPct', label: 'Mastery', type: 'number', format: (v) => pct(v) },
  { key: 'level', label: 'Level', type: 'text', verdict: (r) => V.masteryVerdict(r.masteryPct, settings.value) },
  { key: 'bar', label: '', type: 'number', value: (r) => r.masteryPct, filterable: false, sortable: false, exportable: false },
]
</script>
