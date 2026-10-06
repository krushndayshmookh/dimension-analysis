<template>
  <div>
    <div class="feedback-screen grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <StudentSidebar v-model="selectedIds" :items="items" multiple />

      <div class="flex min-w-0 flex-col gap-6">
        <PageHeader
          title="Feedback sheets"
          description="One page per student: marks, dimensions, lowest topics and (optionally) marks per question. Choose the students in the sidebar, then print or save as PDF, or download as HTML."
        />

        <SectionCard title="Contents" description="These start from the Feedback sheets settings. Changing them here affects only this page.">
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label v-for="o in toggles" :key="o.key" class="flex items-center gap-2 text-sm">
              <Checkbox :model-value="options[o.key]" @update:model-value="(v) => (options[o.key] = Boolean(v))" />
              {{ o.label }}
            </label>
            <Field label="Lowest topics to list" html-for="fs-topics">
              <NumberInput id="fs-topics" v-model="options.lowestTopics" :min="0" :max="20" :step="1" />
            </Field>
          </div>
          <Field label="Note for every sheet (optional)" html-for="fs-note">
            <Textarea id="fs-note" v-model="generalNote" rows="2" placeholder="Shown at the bottom of each sheet under Comments" />
          </Field>
          <div class="flex flex-wrap gap-2">
            <Button :disabled="!selectedIds.length" @click="printSheets">
              <PrinterIcon /> Print / save as PDF ({{ selectedIds.length }} sheet{{ selectedIds.length === 1 ? '' : 's' }})
            </Button>
            <Button variant="outline" :disabled="!previewId" @click="downloadOne"><DownloadIcon /> Download this sheet (HTML)</Button>
            <Button variant="outline" :disabled="!selectedIds.length" @click="downloadAll"><DownloadIcon /> Download all (one HTML file)</Button>
          </div>
        </SectionCard>

        <EmptyState v-if="!previewId">Select at least one student in the sidebar.</EmptyState>
        <template v-else>
          <div class="flex items-center gap-3">
            <Button variant="outline" size="sm" :disabled="previewIndex <= 0" @click="step(-1)"><ChevronLeftIcon /> Previous</Button>
            <span class="text-sm">Sheet {{ previewIndex + 1 }} of {{ selectedIds.length }}</span>
            <Button variant="outline" size="sm" :disabled="previewIndex >= selectedIds.length - 1" @click="step(1)">Next <ChevronRightIcon /></Button>
          </div>
          <Field :label="`Comment for ${previewSheet.header.studentName} (optional)`" html-for="fs-student-note">
            <Textarea id="fs-student-note" v-model="comments[previewId]" rows="2" placeholder="Shown on this student's sheet only" />
          </Field>
          <div ref="previewEl"><FeedbackSheet :sheet="previewSheet" :levels="options.showLevels" /></div>
        </template>
      </div>
    </div>

    <!-- Rendered only while printing or downloading all sheets. -->
    <div v-if="renderAll" ref="allEl" class="print-area">
      <FeedbackSheet v-for="sheet in allSheets" :key="sheet.header.studentId" :sheet="sheet" :levels="options.showLevels" />
    </div>
  </div>
</template>

<script setup>
import PageHeader from '@/components/common/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import StatCard from '@/components/common/StatCard.vue'
import StatGrid from '@/components/common/StatGrid.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, PrinterIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import Field from '@/components/common/Field.vue'
import NumberInput from '@/components/common/NumberInput.vue'
import { storeToRefs } from 'pinia'
import { useSessionStore } from '@/stores/session.js'
import { useSettingsStore } from '@/stores/settings.js'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import StudentSidebar from '@/components/display/StudentSidebar.vue'
import FeedbackSheet from '@/components/feedback/FeedbackSheet.vue'
import { buildFeedback, DEFAULT_FEEDBACK_OPTIONS, feedbackFileName } from '@/lib/feedback.js'
import { downloadText, htmlDocument, pageCss } from '@/lib/download.js'
import * as V from '@/lib/verdicts.js'
import { formatPct as pct } from '@/lib/format.js'

const sessionStore = useSessionStore()
const { exam } = storeToRefs(sessionStore)
const { openStudent } = sessionStore
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)


const profiles = computed(() => exam.value.profiles)
const items = computed(() =>
  profiles.value.students.map((s) => ({
    id: s.id,
    name: s.name,
    section: s.section,
    detail: pct(s.masteryPct),
    tone: V.masteryVerdict(s.masteryPct, settings.value)?.tone ?? null,
  }))
)

const toggles = [
  { key: 'showQuestionMarks', label: 'Marks per question' },
  { key: 'showCohortAverage', label: 'Cohort average' },
  { key: 'showRank', label: 'Rank' },
  { key: 'showPercentile', label: 'Percentile' },
  { key: 'showLevels', label: 'Level tags (Weak / Average / Strong)' },
]
const options = reactive({ ...DEFAULT_FEEDBACK_OPTIONS, ...settings.value.feedback })
const generalNote = ref('')
const comments = reactive({})
const selectedIds = ref(profiles.value.students.map((s) => s.id))

const context = computed(() => ({
  dataset: exam.value.dataset,
  profiles: profiles.value,
  exam: { courseName: exam.value.courseName, examTitle: exam.value.examTitle, examDate: exam.value.examDate },
}))
const sheetFor = (id) => {
  const student = profiles.value.students.find((s) => s.id === id)
  const comment = [generalNote.value.trim(), (comments[id] ?? '').trim()].filter(Boolean).join('\n\n')
  return buildFeedback(student, context.value, { ...options, comment })
}

// The sheet shown in the preview: the selected student the instructor is looking at.
const previewId = ref(selectedIds.value[0] ?? '')
watch(selectedIds, (ids) => {
  if (!ids.includes(previewId.value)) previewId.value = ids[0] ?? ''
})
const previewIndex = computed(() => selectedIds.value.indexOf(previewId.value))
const step = (delta) => {
  previewId.value = selectedIds.value[previewIndex.value + delta] ?? previewId.value
}
const previewSheet = computed(() => sheetFor(previewId.value))
const previewEl = ref(null)

// All sheets are rendered only when needed: hundreds of sheets would slow the page.
const renderAll = ref(false)
const allEl = ref(null)
const allSheets = computed(() => (renderAll.value ? selectedIds.value.map(sheetFor) : []))

async function printSheets() {
  renderAll.value = true
  await nextTick()
  document.body.classList.add('printing-sheets')
  window.print()
}
function stopPrinting() {
  document.body.classList.remove('printing-sheets')
  renderAll.value = false
}
onMounted(() => window.addEventListener('afterprint', stopPrinting))
onBeforeUnmount(() => {
  window.removeEventListener('afterprint', stopPrinting)
  stopPrinting()
})

const title = computed(() => `${exam.value.examTitle} feedback`)
function downloadOne() {
  downloadText(`${feedbackFileName(previewSheet.value.header)}.html`, htmlDocument(title.value, previewEl.value.innerHTML, pageCss()))
}
async function downloadAll() {
  renderAll.value = true
  await nextTick()
  const html = allEl.value.innerHTML
  renderAll.value = false
  const body = `<div class="print-area" style="display:block">${html}</div>`
  downloadText(`${feedbackFileName({ studentId: exam.value.examTitle, studentName: 'all-sheets' })}.html`, htmlDocument(title.value, body, pageCss() + '\n.print-area { display: block !important; }'))
}
</script>
