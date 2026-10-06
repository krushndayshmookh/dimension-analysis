<template>
  <div class="flex flex-col gap-6">
    <PageHeader help="page.converter"
      title="Sheet converter"
      description="Turns the analytics team's sheets into the files the Cohorts and Upload pages take: the students (cohort), the exam config, the scores and the attendance. Nothing is imported here: check and edit the result, then download the CSVs."
    />

    <SectionCard title="Sheets" help="converter.sheets" description="Choose any of: the question listing, the coding scores, the quiz scores and the enrolled students. Each sheet is recognised by its columns.">
      <FileInput multiple aria-label="Sheets to convert" @change="addFiles" />
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
import { detectSheet, SHEET_LABELS } from '@/lib/convert/detect.js'
import { readEnrolled } from '@/lib/convert/enrolled.js'
import { readListing } from '@/lib/convert/listing.js'
import { readQuiz } from '@/lib/convert/quiz.js'

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
    if (!type) rejected.value.push(`${file.name}: the columns match none of the four sheets`)
    else sheets[type] = { fileName: file.name, result: READERS[type](parsed) }
  }
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
