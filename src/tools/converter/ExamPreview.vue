<template>
  <SectionCard :title="`${label} exam`" :description="summary">
    <NoticeAlert v-if="exam.issues.length" kind="info" title="Notes from the conversion">
      <ul class="list-disc pl-5">
        <li v-for="(item, i) in exam.issues" :key="i">{{ item.text }}</li>
      </ul>
    </NoticeAlert>

    <h4 class="text-sm font-semibold">Questions</h4>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Question</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Difficulty</TableHead>
          <TableHead>Dimensions (; between)</TableHead>
          <TableHead>Topics (optional, ; between)</TableHead>
          <TableHead class="w-24">Marks</TableHead>
          <TableHead class="w-24">Expected %</TableHead>
          <TableHead class="w-12"><span class="sr-only">Remove</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="row in config" :key="row.key" :class="hasError(row.question_id) ? 'bg-destructive/10' : ''">
          <TableCell class="font-medium">{{ row.question_id }}</TableCell>
          <TableCell>{{ row.question_type }}</TableCell>
          <TableCell><Input v-model="row.question_difficulty" class="h-7 w-28" :aria-label="`Difficulty of ${row.question_id}`" /></TableCell>
          <TableCell><Input v-model="row.question_dimension" class="h-7 min-w-36" :aria-label="`Dimensions of ${row.question_id}`" /></TableCell>
          <TableCell><Input v-model="row.question_topics" class="h-7 min-w-44" :aria-label="`Topics of ${row.question_id}`" /></TableCell>
          <TableCell><Input v-model="row.marks" type="number" step="any" class="h-7" :aria-label="`Marks of ${row.question_id}`" /></TableCell>
          <TableCell><Input v-model="row.expected_solve_rate" type="number" class="h-7" :aria-label="`Expected solve rate of ${row.question_id}`" /></TableCell>
          <TableCell><Button variant="ghost" size="icon-sm" :aria-label="`Remove question ${row.question_id}`" @click="removeQuestion(row)"><TrashIcon /></Button></TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <template v-if="extras.length">
      <h4 class="text-sm font-semibold">Listing rows that are not in the exam</h4>
      <p class="text-xs text-muted-foreground">Add a row to include it as a question. It gets the same marks as the other {{ label.toLowerCase() }} questions; its scores stay blank.</p>
      <Table>
        <TableBody>
          <TableRow v-for="row in extras" :key="row.key">
            <TableCell class="font-medium">{{ row.question_id || '(no id)' }}</TableCell>
            <TableCell>{{ row.question_type }}</TableCell>
            <TableCell>{{ row.question_dimension }}</TableCell>
            <TableCell class="text-muted-foreground">{{ row.reason }}</TableCell>
            <TableCell class="text-right"><Button variant="outline" size="xs" @click="addExtra(row)"><PlusIcon /> Add</Button></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </template>

    <h4 class="text-sm font-semibold">Students ({{ students.length }}, {{ absentCount }} absent)</h4>
    <div class="max-h-96 overflow-y-auto rounded-lg border">
      <Table>
        <TableHeader class="sticky top-0 bg-card">
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead class="w-32">Section</TableHead>
            <TableHead class="w-24">Absent</TableHead>
            <TableHead class="w-12"><span class="sr-only">Remove</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="s in students" :key="s.id">
            <TableCell class="font-medium">{{ s.id }}</TableCell>
            <TableCell><Input v-model="s.name" class="h-7 min-w-48" :aria-label="`Name of ${s.id}`" /></TableCell>
            <TableCell><Input v-model="s.section" class="h-7" :aria-label="`Section of ${s.id}`" /></TableCell>
            <TableCell><Checkbox v-model="s.absent" :aria-label="`${s.id} was absent`" /></TableCell>
            <TableCell><Button variant="ghost" size="icon-sm" :aria-label="`Remove student ${s.id}`" @click="removeStudent(s)"><TrashIcon /></Button></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <NoticeAlert v-if="errors.length" kind="error" :title="`The Upload page would reject this: ${errors.length} problem${errors.length === 1 ? '' : 's'}`">
      <ul class="list-disc pl-5">
        <li v-for="(e, i) in errors.slice(0, 20)" :key="i">{{ e }}</li>
      </ul>
      <p v-if="errors.length > 20" class="mt-1">…and {{ errors.length - 20 }} more.</p>
    </NoticeAlert>
    <NoticeAlert v-else kind="info">The files are valid. Scores are written as the share of each question earned times its marks.</NoticeAlert>

    <div class="flex flex-wrap items-center gap-2">
      <Button :disabled="errors.length > 0" @click="downloadAll"><DownloadIcon /> Download all three</Button>
      <Button v-for="file in FILES" :key="file.key" variant="outline" :disabled="errors.length > 0" @click="download(file)">
        <DownloadIcon /> {{ file.name }}
      </Button>
    </div>
  </SectionCard>
</template>

<script setup>
import { computed, ref } from 'vue'
import { DownloadIcon, PlusIcon, TrashIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import NoticeAlert from '@/components/common/NoticeAlert.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import { configTable, extraToConfig, scoresTable, studentsTable } from '@/lib/convert/assemble.js'
import { toCsv } from '@/lib/convert/common.js'
import { downloadText } from '@/lib/download.js'
import { readDataset } from '@/lib/input.js'

const props = defineProps({
  // One result of assembleExam(), with a `label`.
  exam: { type: Object, required: true },
  label: { type: String, required: true },
})

// The instructor edits copies; the result of the conversion itself is not changed.
const config = ref(props.exam.config.map((row) => ({ ...row })))
const extras = ref(props.exam.extras.map((row) => ({ ...row })))
const students = ref(props.exam.students.map((s) => ({ section: '', ...s })))

const absentCount = computed(() => students.value.filter((s) => s.absent).length)
const summary = computed(() => `${config.value.length} questions · ${students.value.length} students${props.exam.set ? ` · set ${props.exam.set}` : ''}`)

const removeQuestion = (row) => {
  config.value = config.value.filter((r) => r !== row)
}
const removeStudent = (student) => {
  students.value = students.value.filter((s) => s !== student)
}
function addExtra(extra) {
  const sibling = config.value.find((r) => r.kind === extra.kind)
  config.value.push(extraToConfig(extra, sibling?.marks ?? ''))
  extras.value = extras.value.filter((r) => r !== extra)
}

const tables = computed(() => ({
  config: configTable(config.value),
  scores: scoresTable(config.value, students.value, props.exam.fractions),
  students: studentsTable(students.value),
}))

// The application's own checks, so what is downloaded is what Upload accepts.
const asParsed = ({ columns, rows }) => ({ data: rows, meta: { fields: columns }, errors: [] })
const errors = computed(() => {
  if (!config.value.length) return ['The exam has no questions']
  return readDataset({ config: asParsed(tables.value.config), scores: asParsed(tables.value.scores), students: asParsed(tables.value.students) }).errors
})
const hasError = (id) => errors.value.some((e) => e.includes(`(${id})`) || e.includes(`${id}:`))

const slug = computed(() => props.label.toLowerCase().replace(/\W+/g, '-'))
const FILES = [
  { key: 'config', name: 'exam_config.csv' },
  { key: 'scores', name: 'student_scores.csv' },
  { key: 'students', name: 'students.csv' },
]
function download(file) {
  const { rows, columns } = tables.value[file.key]
  downloadText(`${slug.value}_${file.name}`, toCsv(rows, columns), 'text/csv;charset=utf-8')
}
const downloadAll = () => FILES.forEach((f, i) => setTimeout(() => download(f), i * 250))
</script>
