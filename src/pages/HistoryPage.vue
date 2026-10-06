<template>
  <div class="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
    <StudentSidebar v-model="historyStudentId" :items="items" />

    <div class="flex min-w-0 flex-col gap-6">
      <PageHeader title="Longitudinal history" description="A student's results across all saved exams. Students are matched by student_id." />

      <SectionCard v-if="history" :title="`${history.name} (${history.id})`">
        <LineChart v-if="rows.length > 1" :labels="rows.map((r) => `${r.examTitle} (${r.examDate})`)" :series="series" y-label="mastery %" />
        <DataTable :columns="columns" :rows="rows" row-key="examId" :default-sort="{ key: 'examDate', dir: 'asc' }" export-name="student-history" />
      </SectionCard>
      <EmptyState v-else>
        {{ historyStudents.length ? 'Select a student.' : 'No saved exams yet. Upload an exam to start a history.' }}
      </EmptyState>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import DataTable from '@/components/display/DataTable.vue'
import StudentSidebar from '@/components/display/StudentSidebar.vue'
import LineChart from '@/components/charts/LineChart.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import { dimensionColor } from '@/lib/colors.js'
import { DIMENSIONS } from '@/lib/constants.js'
import { historyDeltas } from '@/lib/compare.js'
import { formatNumber as num, formatPct as pct, formatSigned as signed } from '@/lib/format.js'
import * as V from '@/lib/verdicts.js'
import * as api from '@/api.js'
import { useNoticeStore } from '@/stores/notice.js'
import { useSessionStore } from '@/stores/session.js'
import { useSettingsStore } from '@/stores/settings.js'

const sessionStore = useSessionStore()
const { historyStudents, historyStudentId } = storeToRefs(sessionStore)
const { refreshHistoryStudents } = sessionStore
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
const { fail } = useNoticeStore()

const history = ref(null)

async function load() {
  history.value = null
  if (!historyStudentId.value) return
  try {
    history.value = await api.getStudentHistory(historyStudentId.value)
  } catch (err) {
    fail(err)
  }
}
watch(historyStudentId, load)
onMounted(async () => {
  await refreshHistoryStudents()
  await load()
})

const items = computed(() => historyStudents.value.map((s) => ({ id: s.id, name: s.name, detail: `${s.examCount} exam${s.examCount === 1 ? '' : 's'}` })))

const rows = computed(() =>
  historyDeltas(history.value?.exams ?? []).map((e) => ({
    ...e,
    ...Object.fromEntries(DIMENSIONS.map((d) => [`dim-${d}`, e.dimensions?.[d]?.masteryPct ?? null])),
  }))
)
const series = computed(() => [
  { label: 'Overall mastery', data: rows.value.map((r) => r.masteryPct), color: '#111827' },
  ...DIMENSIONS.map((d) => ({ label: d, data: rows.value.map((r) => r[`dim-${d}`]), color: dimensionColor(d) })),
])

const columns = [
  { key: 'examDate', label: 'Date', type: 'text' },
  { key: 'courseName', label: 'Course', type: 'text' },
  { key: 'examTitle', label: 'Exam', type: 'text' },
  { key: 'earned', label: 'Score', type: 'number', format: (v, r) => `${num(v)} / ${num(r.totalMarks)}` },
  { key: 'masteryPct', label: 'Mastery', type: 'number', format: (v) => pct(v) },
  { key: 'deltaMasteryPct', label: 'Change from previous', type: 'number', format: (v) => signed(v, ' pp') },
  { key: 'trend', label: 'Trend', type: 'text', verdict: (r) => V.trendVerdict(r.deltaMasteryPct, settings.value) },
  { key: 'accuracyPct', label: 'Accuracy', type: 'number', format: (v) => pct(v) },
  ...DIMENSIONS.map((d) => ({
    key: `dim-${d}`,
    label: d,
    type: 'number',
    format: (v) => pct(v),
    dot: (r) => V.masteryVerdict(r[`dim-${d}`], settings.value),
  })),
]
</script>
