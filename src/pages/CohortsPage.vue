<template>
  <div class="flex flex-col gap-6">
    <PageHeader
      help="page.cohorts"
      title="Cohorts"
      description="A cohort is a named group of students. Add its students once, then upload any number of exams for it."
    />

    <SectionCard title="Add students" help="cohorts.add">
      <div class="grid gap-4 md:grid-cols-3">
        <Field label="Cohort" html-for="cohortChoice">
          <SelectField id="cohortChoice" v-model="choice" :options="choices" aria-label="Cohort" />
        </Field>
        <Field v-if="choice === NEW" label="Name of the new cohort" html-for="cohortName">
          <Input id="cohortName" v-model="newName" placeholder="For example Batch 2026" />
        </Field>
        <Field label="Students file (CSV)" html-for="cohortFile">
          <FileInput id="cohortFile" aria-label="Students file" @change="(f) => (file = f)" />
          <template #hint>student_id, student_name[, section]</template>
        </Field>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button :disabled="busy" @click="submit">{{ choice === NEW ? 'Create cohort' : 'Add to cohort' }}</Button>
      </div>
      <NoticeAlert v-if="problems.length" kind="error" :title="`Not added: ${problems.length} problem${problems.length === 1 ? '' : 's'}`">
        <ul class="list-disc pl-5"><li v-for="(p, i) in problems.slice(0, 50)" :key="i">{{ p }}</li></ul>
        <p v-if="problems.length > 50" class="mt-1">…and {{ problems.length - 50 }} more.</p>
      </NoticeAlert>
      <NoticeAlert v-if="result" kind="info">
        {{ result.name }}: {{ result.summary.added }} added, {{ result.summary.updated }} updated, {{ result.summary.unchanged }} unchanged.
        Students already in the cohort are never duplicated.
      </NoticeAlert>
    </SectionCard>

    <SectionCard v-if="cohorts.length" title="Cohorts" help="cohorts.list">
      <DataTable :columns="columns" :rows="cohorts" row-key="id" :searchable="false" :default-sort="{ key: 'name', dir: 'asc' }" export-name="cohorts">
        <template #cell-actions="{ row }">
          <span class="flex gap-1.5">
            <Button size="sm" variant="outline" @click="selectedCohortId = row.id">Students</Button>
            <Button size="sm" variant="destructive" @click="remove(row)">Delete</Button>
          </span>
        </template>
      </DataTable>
    </SectionCard>
    <EmptyState v-else>No cohorts yet. Create one above by naming it and choosing its students file.</EmptyState>

    <SectionCard v-if="selected" :title="`${selected.name}: students`" help="cohorts.students">
      <DataTable :columns="studentColumns" :rows="selected.students" row-key="id" export-name="cohort-students" />
    </SectionCard>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import EmptyState from '@/components/common/EmptyState.vue'
import Field from '@/components/common/Field.vue'
import FileInput from '@/components/common/FileInput.vue'
import NoticeAlert from '@/components/common/NoticeAlert.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import SelectField from '@/components/common/SelectField.vue'
import DataTable from '@/components/display/DataTable.vue'
import { useConfirm } from '@/composables/useConfirm.js'
import { parseCsv } from '@/lib/csv.js'
import { readStudentNames } from '@/lib/input.js'
import * as api from '@/api.js'
import { useNoticeStore } from '@/stores/notice.js'
import { useSessionStore } from '@/stores/session.js'

const sessionStore = useSessionStore()
const { cohorts, selectedCohortId } = storeToRefs(sessionStore)
const { refreshCohorts, refreshSaved } = sessionStore
const { fail } = useNoticeStore()
const { confirm } = useConfirm()

const NEW = '__new__'
const choice = ref(NEW)
const newName = ref('')
const file = ref(null)
const busy = ref(false)
const problems = ref([])
const result = ref(null)

const choices = computed(() => [{ value: NEW, label: 'New cohort…' }, ...cohorts.value.map((c) => ({ value: c.id, label: `${c.name} (${c.studentCount} students)` }))])

async function submit() {
  problems.value = []
  result.value = null
  if (choice.value === NEW && !newName.value.trim()) {
    problems.value = ['Give the new cohort a name.']
    return
  }
  if (!file.value) {
    problems.value = ['Choose a students file.']
    return
  }
  busy.value = true
  try {
    const parsed = readStudentNames(await parseCsv(file.value))
    if (parsed.errors.length) {
      problems.value = parsed.errors
      return
    }
    const saved = choice.value === NEW
      ? await api.createCohort({ name: newName.value, students: parsed.students })
      : await api.updateCohort(choice.value, { students: parsed.students })
    await refreshCohorts()
    result.value = { name: cohorts.value.find((c) => c.id === saved.id)?.name ?? newName.value, summary: saved.summary }
    selectedCohortId.value = saved.id
    choice.value = saved.id
    file.value = null
  } catch (err) {
    problems.value = [err.message ?? String(err)]
  } finally {
    busy.value = false
  }
}

async function remove(row) {
  const ok = await confirm({ title: `Delete the cohort "${row.name}"?`, description: 'Its student list is removed. A cohort that exams use cannot be deleted.', confirmLabel: 'Delete', destructive: true })
  if (!ok) return
  try {
    await api.deleteCohort(row.id)
    if (selectedCohortId.value === row.id) selectedCohortId.value = ''
    if (choice.value === row.id) choice.value = NEW
    await Promise.all([refreshCohorts(), refreshSaved()])
  } catch (err) {
    fail(err)
  }
}

const selected = ref(null)
watch(
  [selectedCohortId, cohorts],
  async () => {
    selected.value = null
    if (!selectedCohortId.value) return
    try {
      selected.value = await api.getCohort(selectedCohortId.value)
    } catch (err) {
      fail(err)
    }
  },
  { immediate: true }
)

const columns = [
  { key: 'name', label: 'Cohort', type: 'text' },
  { key: 'studentCount', label: 'Students', type: 'number' },
  { key: 'examCount', label: 'Exams', type: 'number' },
  { key: 'updatedAt', label: 'Last changed', type: 'text', format: (v) => String(v ?? '').slice(0, 10) },
  { key: 'actions', label: '', type: 'text', filterable: false, sortable: false, exportable: false },
]
const studentColumns = [
  { key: 'id', label: 'ID', type: 'text' },
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'section', label: 'Section', type: 'text', format: (v) => v ?? '' },
]
</script>
