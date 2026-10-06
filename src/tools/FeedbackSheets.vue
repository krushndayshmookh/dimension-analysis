<template>
  <div class="feedback-page">
    <section class="with-sidebar feedback-screen">
      <StudentSidebar v-model="selectedIds" :items="items" multiple />

      <div class="view-panel">
        <div class="view-header">
          <div>
            <h2 class="view-title">Feedback sheets</h2>
            <p class="view-desc">
              One page per student: marks, dimensions, lowest topics and (optionally) marks per question. Choose the
              students in the sidebar, then print or save as PDF, or download as HTML.
            </p>
          </div>
        </div>

        <fieldset>
          <legend>Contents</legend>
          <div class="form-grid">
            <label class="check"><input v-model="options.showQuestionMarks" type="checkbox" /> Marks per question</label>
            <label class="check"><input v-model="options.showCohortAverage" type="checkbox" /> Cohort average</label>
            <label class="check"><input v-model="options.showRank" type="checkbox" /> Rank</label>
            <label class="check"><input v-model="options.showPercentile" type="checkbox" /> Percentile</label>
            <label class="check"><input v-model="options.showLevels" type="checkbox" /> Level tags (Weak / Average / Strong)</label>
            <div class="form-group">
              <label for="fs-topics">Lowest topics to list</label>
              <input id="fs-topics" v-model.number="options.lowestTopics" type="number" min="0" max="20" step="1" />
            </div>
          </div>
          <div class="form-group">
            <label for="fs-note">Note for every sheet (optional)</label>
            <textarea id="fs-note" v-model="generalNote" rows="2" placeholder="Shown at the bottom of each sheet under Comments"></textarea>
          </div>
          <p class="hint">These start from the Feedback sheets settings. Changing them here affects only this page.</p>
          <div class="form-actions">
            <button type="button" class="btn-primary" :disabled="!selectedIds.length" @click="printSheets">
              Print / save as PDF ({{ selectedIds.length }} sheet{{ selectedIds.length === 1 ? '' : 's' }})
            </button>
            <button type="button" class="btn-secondary" :disabled="!previewId" @click="downloadOne">Download this sheet (HTML)</button>
            <button type="button" class="btn-secondary" :disabled="!selectedIds.length" @click="downloadAll">Download all (one HTML file)</button>
          </div>
        </fieldset>

        <div v-if="!previewId" class="empty-state"><p>Select at least one student in the sidebar.</p></div>
        <template v-else>
          <div class="preview-nav">
            <button type="button" class="btn-sm btn-secondary" :disabled="previewIndex <= 0" @click="step(-1)">← Previous</button>
            <span>Sheet {{ previewIndex + 1 }} of {{ selectedIds.length }}</span>
            <button type="button" class="btn-sm btn-secondary" :disabled="previewIndex >= selectedIds.length - 1" @click="step(1)">Next →</button>
          </div>
          <div class="form-group">
            <label for="fs-student-note">Comment for {{ previewSheet.header.studentName }} (optional)</label>
            <textarea id="fs-student-note" v-model="comments[previewId]" rows="2" placeholder="Shown on this student's sheet only"></textarea>
          </div>
          <div ref="previewEl"><FeedbackSheet :sheet="previewSheet" :levels="options.showLevels" /></div>
        </template>
      </div>
    </section>

    <!-- Rendered only while printing or downloading all sheets. -->
    <div v-if="renderAll" ref="allEl" class="print-area">
      <FeedbackSheet v-for="sheet in allSheets" :key="sheet.header.studentId" :sheet="sheet" :levels="options.showLevels" />
    </div>
  </div>
</template>

<script setup>
import { computed, inject, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import StudentSidebar from '../components/StudentSidebar.vue'
import FeedbackSheet from '../components/FeedbackSheet.vue'
import { buildFeedback, DEFAULT_FEEDBACK_OPTIONS, feedbackFileName } from '../lib/feedback.js'
import { downloadText, htmlDocument, pageCss } from '../lib/download.js'
import * as V from '../lib/verdicts.js'
import { formatPct as pct } from '../lib/format.js'

defineEmits(['open-student'])

const exam = inject('exam')
const settings = inject('settings')

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
