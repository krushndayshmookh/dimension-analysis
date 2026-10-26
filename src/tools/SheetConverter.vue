<template>
  <div class="flex flex-col gap-6">
    <PageHeader help="page.converter"
      title="Sheet converter"
      description="Turns the analytics team's source sheets into the files the Cohorts and Upload pages take: the students (cohort), the exam config, the scores and the attendance. Nothing is imported here: check and edit the result, then download the CSVs."
    />

    <SectionCard title="Sheets" help="converter.sheets" description="Choose any of: a question listing or exam_config.csv, one or more coding score files, one or more quiz score files and enrolled students. Each sheet is recognised by its columns; score files of the same type are merged.">
      <FileInput multiple aria-label="Sheets to convert" @change="addFiles" />
      <div v-if="pending.length" class="flex flex-col gap-4 rounded-lg border p-4">
        <h3 class="text-sm font-semibold">Map unrecognised columns</h3>
        <p class="text-xs text-muted-foreground">Choose the sheet type, then map the required fields to the columns in each file. Unmapped columns are ignored.</p>
        <div v-for="item in pending" :key="item.id" class="flex flex-col gap-3 rounded-lg border p-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-sm font-medium">{{ item.fileName }}</span>
            <select v-model="item.type" class="h-8 rounded-md border bg-background px-2 text-sm" aria-label="Sheet type" @change="item.mapping = initialColumnMapping(item.type, item.fields)">
              <option value="">Choose sheet type…</option>
              <option v-for="(label, type) in SHEET_LABELS" :key="type" :value="type">{{ label }}</option>
            </select>
          </div>
          <div class="flex flex-wrap gap-1">
            <Badge v-for="field in item.fields" :key="field" variant="outline">{{ field }}</Badge>
          </div>
          <div v-if="item.type" class="grid gap-2 md:grid-cols-2">
            <label v-for="field in mappedFields(item)" :key="field" class="grid gap-1 text-xs">
              <span>{{ field }}{{ isRequired(item.type, field) ? ' *' : '' }}</span>
              <select v-model="item.mapping[field]" class="h-8 rounded-md border bg-background px-2 text-sm">
                <option value="">Not mapped</option>
                <option v-for="source in item.fields" :key="source" :value="source">{{ source }}</option>
              </select>
            </label>
          </div>
          <div v-if="item.type" class="grid gap-2 text-xs md:grid-cols-2">
            <div><span class="font-medium">Mapped columns:</span> {{ mappedSourceFields(item).join(', ') || 'none' }}</div>
            <div class="text-muted-foreground"><span class="font-medium">Unmapped columns:</span> {{ unmappedSourceFields(item).join(', ') || 'none' }}</div>
          </div>
          <div class="flex justify-end">
            <Button size="sm" :disabled="!mappingReady(item)" @click="applyMapping(item)">Use mapped file</Button>
          </div>
        </div>
      </div>
      <ul v-if="loaded.length" class="flex flex-col gap-1 text-sm">
        <li v-for="item in loaded" :key="item.type" class="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{{ SHEET_LABELS[item.type] }}</Badge>
          <span class="text-muted-foreground">{{ item.fileName }} · {{ item.count }} {{ item.unit }}</span>
          <Button variant="ghost" size="xs" @click="remove(item.type)"><XIcon /> Remove</Button>
        </li>
      </ul>
      <NoticeAlert v-if="rejected.length" kind="error" title="Not recognised">
        <ul class="list-disc pl-5"><li v-for="(r, i) in rejected" :key="i">{{ r }}</li></ul>
      </NoticeAlert>
    </SectionCard>

    <SectionCard v-if="hasScores" title="Marks" help="converter.marks" description="Each type's total marks are divided equally over its questions. Coding scores follow the share of test cases passed.">
      <div class="grid gap-4 md:grid-cols-3">
        <Field v-if="sheets.coding" label="Total marks of the coding questions" html-for="codingMarks">
          <NumberInput id="codingMarks" v-model="codingMarks" :min="0" aria-label="Total coding marks" />
          <template #hint>{{ perQuestion('coding') }}</template>
        </Field>
        <Field v-if="sheets.quiz" label="Total marks of the quiz questions" html-for="quizMarks">
          <NumberInput id="quizMarks" v-model="quizMarks" :min="0" aria-label="Total quiz marks" />
          <template #hint>{{ perQuestion('quiz') }}</template>
        </Field>
      </div>
      <label v-if="sheets.coding && sheets.quiz" class="flex items-center gap-2 text-sm">
        <Checkbox v-model="combined" /> Combine coding and quiz into one exam
      </label>
    </SectionCard>

    <EmptyState v-if="!hasScores">
      Choose a coding or quiz score sheet to start. Add the question listing to fill in difficulty, dimensions and topics, and the enrolled students for names.
    </EmptyState>

    <ExamPreview v-for="exam in exams" :key="exam.label + exam.signature" :exam="exam" :label="exam.label" />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { XIcon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import EmptyState from '@/components/common/EmptyState.vue'
import Field from '@/components/common/Field.vue'
import FileInput from '@/components/common/FileInput.vue'
import NoticeAlert from '@/components/common/NoticeAlert.vue'
import NumberInput from '@/components/common/NumberInput.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import ExamPreview from '@/tools/converter/ExamPreview.vue'
import { parseCsv } from '@/lib/csv.js'
import { assembleExam } from '@/lib/convert/assemble.js'
import { readCoding } from '@/lib/convert/coding.js'
import { detectSheet, initialColumnMapping, mapColumns, SHEET_FIELDS, SHEET_LABELS } from '@/lib/convert/detect.js'
import { readEnrolled } from '@/lib/convert/enrolled.js'
import { readListing } from '@/lib/convert/listing.js'
import { readQuiz } from '@/lib/convert/quiz.js'
import { mergeScoreResults } from '@/lib/convert/common.js'

const READERS = { listing: readListing, coding: readCoding, quiz: readQuiz, enrolled: readEnrolled }
const UNITS = { listing: 'rows', coding: 'questions', quiz: 'questions', enrolled: 'students' }
const COUNTS = {
  listing: (r) => r.questions.length,
  coding: (r) => r.questions.length,
  quiz: (r) => r.questions.length,
  enrolled: (r) => r.students.length,
}

const sheets = reactive({ listing: null, coding: null, quiz: null, enrolled: null })
const rejected = ref([])
const pending = ref([])
let pendingId = 0
const codingMarks = ref(NaN)
const quizMarks = ref(NaN)
const combined = ref(false)

const loaded = computed(() =>
  Object.entries(sheets)
    .filter(([, sheet]) => sheet)
    .map(([type, sheet]) => ({ type, fileName: sheet.fileName, count: COUNTS[type](sheet.result), unit: UNITS[type] }))
)
const hasScores = computed(() => Boolean(sheets.coding || sheets.quiz))

async function addFiles(files) {
  rejected.value = []
  for (const file of files) {
    const parsed = await parseCsv((await file.text()).replace(/^﻿/, ''))
    const type = detectSheet(parsed.meta.fields)
    if (!type) pending.value.push({ id: ++pendingId, fileName: file.name, parsed, fields: parsed.meta.fields, type: '', mapping: {} })
    else if ((type === 'coding' || type === 'quiz') && sheets[type]) {
      sheets[type] = {
        fileName: `${sheets[type].fileName}, ${file.name}`,
        result: mergeScoreResults(sheets[type].result, READERS[type](parsed)),
      }
    } else sheets[type] = { fileName: file.name, result: READERS[type](parsed) }
  }
}

const mappedFields = (item) => item.type ? [...SHEET_FIELDS[item.type].required, ...SHEET_FIELDS[item.type].optional] : []
const isRequired = (type, field) => SHEET_FIELDS[type].required.includes(field)
const mappingReady = (item) => Boolean(item.type && SHEET_FIELDS[item.type].required.every((field) => item.mapping[field]))
const mappedSourceFields = (item) => [...new Set(Object.values(item.mapping).filter(Boolean))]
const unmappedSourceFields = (item) => item.fields.filter((field) => !mappedSourceFields(item).includes(field))

function applyMapping(item) {
  const parsed = mapColumns(item.parsed, item.mapping)
  const result = READERS[item.type](parsed)
  if (result.issues?.some((entry) => entry.level === 'error')) {
    rejected.value.push(`${item.fileName}: ${result.issues.filter((entry) => entry.level === 'error').map((entry) => entry.text).join('; ')}`)
    return
  }
  if ((item.type === 'coding' || item.type === 'quiz') && sheets[item.type]) {
    sheets[item.type] = { fileName: `${sheets[item.type].fileName}, ${item.fileName}`, result: mergeScoreResults(sheets[item.type].result, result) }
  } else sheets[item.type] = { fileName: item.fileName, result }
  pending.value = pending.value.filter((candidate) => candidate !== item)
}

const remove = (type) => {
  sheets[type] = null
}

const perQuestion = (kind) => {
  const total = kind === 'coding' ? codingMarks.value : quizMarks.value
  const count = sheets[kind]?.result.questions.length ?? 0
  if (!(total > 0) || !count) return `${count} questions`
  return `${count} questions · ${Math.round((total / count) * 10000) / 10000} marks each`
}

// One exam per score sheet, or one for both when combined.
const exams = computed(() => {
  if (!hasScores.value) return []
  const base = {
    listing: sheets.listing?.result ?? null,
    enrolled: sheets.enrolled?.result ?? null,
    totalMarks: { coding: codingMarks.value, quiz: quizMarks.value },
  }
  const part = (label, coding, quiz) => {
    const exam = assembleExam({ ...base, coding, quiz })
    // Changes to what the sheet means start the preview over, so edits are made last.
    return { label, ...exam, signature: JSON.stringify([base.totalMarks, Object.keys(sheets).filter((k) => sheets[k]).map((k) => sheets[k].fileName)]) }
  }
  const coding = sheets.coding?.result ?? null
  const quiz = sheets.quiz?.result ?? null
  if (combined.value && coding && quiz) return [part('Combined', coding, quiz)]
  return [coding && part('Coding', coding, null), quiz && part('Quiz', null, quiz)].filter(Boolean)
})
</script>
