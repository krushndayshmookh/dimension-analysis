<template>
  <div class="flex flex-col gap-6">
    <PageHeader help="page.upload" title="Upload exam data">
      <template #description>
        An exam is uploaded for a cohort, whose students are added once on the Cohorts page. Files must follow the format in
        <code class="rounded bg-muted px-1">templates/README.md</code>; files that do not are rejected with the rows that need fixing.
        Examples to upload are in <code class="rounded bg-muted px-1">samples/</code>.
      </template>
    </PageHeader>

    <EmptyState v-if="!cohorts.length">
      There is no cohort yet. <Button variant="link" class="h-auto p-0" @click="tab = 'cohorts'">Create one on the Cohorts page</Button>
      by adding its students, then come back to upload an exam.
    </EmptyState>

    <form v-else class="flex flex-col gap-4" @submit.prevent="analyze">
      <SectionCard title="Exam" help="upload.exam">
        <div class="grid gap-4 md:grid-cols-4">
          <Field label="Cohort" html-for="cohortId">
            <SelectField id="cohortId" v-model="cohortId" :options="cohortOptions" placeholder="Choose a cohort" aria-label="Cohort" />
          </Field>
          <Field label="Course name" html-for="courseName">
            <Input id="courseName" v-model="meta.courseName" required />
          </Field>
          <Field label="Exam title" html-for="examTitle">
            <Input id="examTitle" v-model="meta.examTitle" required />
          </Field>
          <Field label="Exam date" html-for="examDate">
            <Input id="examDate" v-model="meta.examDate" type="date" required />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="CSV files" help="upload.files">
        <div class="grid gap-4 md:grid-cols-3">
          <Field label="Exam config *" html-for="configFile">
            <FileInput id="configFile" aria-label="Exam config file" @change="(f) => pick('config', f)" />
            <template #hint>question_id, question_type, question_difficulty, question_dimension, marks[, question_topics][, expected_solve_rate][, question_subtype][, correct_option]</template>
          </Field>
          <Field label="Student scores *" html-for="scoresFile">
            <FileInput id="scoresFile" aria-label="Student scores file" @change="(f) => pick('scores', f)" />
            <template #hint>student_id, then one column per question_id: marks, or for mcq questions the option chosen. Blank = unattempted. A cohort student with no row is absent.</template>
          </Field>
          <Field label="Attendance (optional)" html-for="attendanceFile">
            <FileInput id="attendanceFile" aria-label="Attendance file" @change="(f) => pick('attendance', f)" />
            <template #hint>student_id, attendance (present or absent). Only needed to mark absent students who have a scores row.</template>
          </Field>
        </div>
        <div>
          <Button type="submit" :disabled="analyzing">{{ analyzing ? 'Analyzing…' : 'Analyze and save' }}</Button>
        </div>
      </SectionCard>
    </form>

    <NoticeAlert v-if="issues.errors.length" kind="error" :title="`Upload rejected: ${issues.errors.length} problem${issues.errors.length === 1 ? '' : 's'}`">
      <ul class="list-disc pl-5">
        <li v-for="(e, i) in issues.errors.slice(0, 50)" :key="i">{{ e }}</li>
      </ul>
      <p v-if="issues.errors.length > 50" class="mt-1">…and {{ issues.errors.length - 50 }} more.</p>
    </NoticeAlert>
    <NoticeAlert v-if="issues.warnings.length" kind="info" title="Notes">
      <ul class="list-disc pl-5">
        <li v-for="(w, i) in issues.warnings" :key="i">{{ w }}</li>
      </ul>
    </NoticeAlert>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import EmptyState from '@/components/common/EmptyState.vue'
import Field from '@/components/common/Field.vue'
import FileInput from '@/components/common/FileInput.vue'
import NoticeAlert from '@/components/common/NoticeAlert.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import SelectField from '@/components/common/SelectField.vue'
import { EXAM_LANDING_PAGE } from '@/pages/registry.js'
import { parseCsv } from '@/lib/csv.js'
import { readDataset } from '@/lib/input.js'
import { checkDataQuality } from '@/lib/quality.js'
import { questionSummaries } from '@/lib/reuse.js'
import * as api from '@/api.js'
import { useNoticeStore } from '@/stores/notice.js'
import { useSessionStore } from '@/stores/session.js'
import { useSettingsStore } from '@/stores/settings.js'

const sessionStore = useSessionStore()
const { tab, exam, cohorts } = storeToRefs(sessionStore)
const { openExam, refreshSaved, refreshCohorts, refreshHistoryStudents } = sessionStore
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
const noticeStore = useNoticeStore()
const { notify, dismiss } = noticeStore

const meta = reactive({ courseName: '', examTitle: '', examDate: new Date().toISOString().slice(0, 10) })
const cohortId = ref(undefined)
const cohortOptions = computed(() => cohorts.value.map((c) => ({ value: c.id, label: `${c.name} (${c.studentCount} students)` })))
const files = reactive({ config: null, scores: null, attendance: null })
const issues = reactive({ errors: [], warnings: [] })
const analyzing = ref(false)

function pick(kind, file) {
  files[kind] = file
  issues.errors = []
  issues.warnings = []
}

async function analyze() {
  issues.errors = []
  issues.warnings = []
  dismiss()
  if (!cohortId.value) {
    issues.errors = ['Choose the cohort this exam is for.']
    return
  }
  if (!files.config || !files.scores) {
    issues.errors = ['Select an exam config file and a student scores file.']
    return
  }
  analyzing.value = true
  try {
    const cohort = await api.getCohort(cohortId.value)
    const result = readDataset({
      config: await parseCsv(files.config),
      scores: await parseCsv(files.scores),
      cohort: cohort.students,
      attendance: files.attendance ? await parseCsv(files.attendance) : null,
    })
    issues.warnings = result.warnings
    if (result.errors.length) {
      issues.errors = result.errors
      return
    }
    issues.warnings = [...result.warnings, ...checkDataQuality(result.dataset, settings.value)]
    openExam({ ...meta, cohortId: cohortId.value, dataset: result.dataset })
    try {
      const { id } = await api.saveExam({
        ...meta,
        cohortId: cohortId.value,
        dataset: result.dataset,
        analysis: exam.value.profiles,
        questionSummaries: questionSummaries(exam.value.paper),
      })
      exam.value = { ...exam.value, id }
      notify('info', 'Exam analyzed and saved.')
    } catch (err) {
      notify('error', `Analyzed, but not saved: ${err.message}`)
    }
    await Promise.all([refreshSaved(), refreshCohorts(), refreshHistoryStudents()])
    tab.value = EXAM_LANDING_PAGE
  } catch (err) {
    issues.errors = [err.message ?? String(err)]
  } finally {
    analyzing.value = false
  }
}
</script>
