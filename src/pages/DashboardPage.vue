<template>
  <div class="flex flex-col gap-6">
    <PageHeader
      help="page.dashboard"
      title="Dashboard"
      description="Where to start: open a saved exam, upload a new one or convert the analytics team's sheets."
    />

    <SectionCard v-if="exam" title="Open exam">
      <p class="text-sm">{{ exam.courseName }} — {{ exam.examTitle }} ({{ exam.examDate }})</p>
      <div class="flex flex-wrap gap-2">
        <Button @click="tab = EXAM_LANDING_PAGE">Go to the cohort</Button>
        <Button variant="outline" @click="closeExam"><XIcon /> Close exam</Button>
      </div>
    </SectionCard>

    <StatGrid>
      <StatCard label="Cohorts" :value="cohorts.length" :description="`${cohorts.reduce((n, c) => n + c.studentCount, 0)} students`" />
      <StatCard label="Saved exams" :value="savedExams.length" />
      <StatCard label="Student results" :value="studentResults" description="students counted once for every exam they took" />
      <StatCard label="Most recent exam" :value="latest?.examTitle ?? '—'" :description="latest ? `${latest.courseName} · ${latest.examDate}` : 'none saved yet'" />
    </StatGrid>

    <SectionCard title="Start">
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" @click="tab = 'cohorts'"><UsersIcon /> Cohorts</Button>
        <Button @click="tab = 'upload'"><UploadIcon /> Upload an exam</Button>
        <Button variant="outline" @click="tab = 'convert'"><FileSpreadsheetIcon /> Convert analytics sheets</Button>
        <Button variant="outline" @click="tab = 'settings'"><SettingsIcon /> Settings</Button>
      </div>
    </SectionCard>

    <SectionCard v-if="recent.length" title="Recent exams" description="The most recently saved exams. All of them, and deleting, are under Saved exams.">
      <DataTable :columns="columns" :rows="recent" row-key="id" :searchable="false" export-name="recent-exams">
        <template #cell-actions="{ row }"><Button size="sm" @click="loadSaved(row)">Open</Button></template>
      </DataTable>
      <div><Button variant="link" class="h-auto p-0" @click="tab = 'saved'">All saved exams</Button></div>
    </SectionCard>
    <EmptyState v-else>No saved exams yet. Upload an exam, or convert the analytics sheets first.</EmptyState>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { FileSpreadsheetIcon, SettingsIcon, UploadIcon, UsersIcon, XIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import StatCard from '@/components/common/StatCard.vue'
import StatGrid from '@/components/common/StatGrid.vue'
import DataTable from '@/components/display/DataTable.vue'
import { formatPct as pct } from '@/lib/format.js'
import { EXAM_LANDING_PAGE } from '@/pages/registry.js'
import { useSessionStore } from '@/stores/session.js'

const sessionStore = useSessionStore()
const { tab, exam, savedExams, cohorts } = storeToRefs(sessionStore)
const { closeExam, loadSaved, cohortName } = sessionStore

const newestFirst = computed(() => [...savedExams.value].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))))
const latest = computed(() => newestFirst.value[0] ?? null)
const recent = computed(() => newestFirst.value.slice(0, 8).map((e) => ({ ...e, cohort: cohortName(e.cohortId) })))
const studentResults = computed(() => savedExams.value.reduce((sum, e) => sum + (e.studentCount ?? 0), 0))

const columns = [
  { key: 'cohort', label: 'Cohort', type: 'text' },
  { key: 'courseName', label: 'Course', type: 'text' },
  { key: 'examTitle', label: 'Exam', type: 'text' },
  { key: 'examDate', label: 'Date', type: 'text' },
  { key: 'questionCount', label: 'Questions', type: 'number' },
  { key: 'studentCount', label: 'Students', type: 'number' },
  { key: 'avgMasteryPct', label: 'Mean mastery', type: 'number', format: (v) => pct(v) },
  { key: 'actions', label: '', type: 'text', filterable: false, sortable: false, exportable: false },
]
</script>
