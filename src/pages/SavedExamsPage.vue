<template>
  <div class="flex flex-col gap-6">
    <PageHeader help="page.saved" title="Saved exams">
      <template #actions><Button variant="outline" @click="refreshSaved"><RefreshCwIcon /> Refresh</Button></template>
    </PageHeader>

    <SectionCard v-if="savedExams.length" help="saved.list">
      <DataTable :columns="columns" :rows="savedExams" row-key="id" :default-sort="{ key: 'createdAt', dir: 'desc' }">
        <template #cell-actions="{ row }">
          <span class="flex gap-1.5">
            <Button size="sm" @click="loadSaved(row)">Open</Button>
            <Button size="sm" variant="destructive" @click="remove(row)">Delete</Button>
          </span>
        </template>
      </DataTable>
    </SectionCard>
    <EmptyState v-else>No saved exams.</EmptyState>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { RefreshCwIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import DataTable from '@/components/display/DataTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import { useConfirm } from '@/composables/useConfirm.js'
import { formatPct as pct } from '@/lib/format.js'
import { useSessionStore } from '@/stores/session.js'

const sessionStore = useSessionStore()
const { savedExams } = storeToRefs(sessionStore)
const { refreshSaved, loadSaved, removeSaved } = sessionStore
const { confirm } = useConfirm()

async function remove(entry) {
  const ok = await confirm({
    title: `Delete "${entry.examTitle}"?`,
    description: 'This also removes it from student histories.',
    confirmLabel: 'Delete',
    destructive: true,
  })
  if (ok) await removeSaved(entry)
}

const columns = [
  { key: 'courseName', label: 'Course', type: 'text' },
  { key: 'examTitle', label: 'Exam', type: 'text' },
  { key: 'examDate', label: 'Date', type: 'text' },
  { key: 'questionCount', label: 'Questions', type: 'number' },
  { key: 'studentCount', label: 'Students', type: 'number' },
  { key: 'avgMasteryPct', label: 'Mean mastery', type: 'number', format: (v) => pct(v) },
  { key: 'createdAt', label: 'Saved at', type: 'text' },
  { key: 'actions', label: '', type: 'text', filterable: false, sortable: false, exportable: false },
]
</script>
