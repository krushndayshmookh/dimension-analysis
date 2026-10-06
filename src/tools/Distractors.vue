<template>
  <section class="view-panel">
    <div class="view-header">
      <div>
        <h2 class="view-title">Distractors</h2>
        <p class="view-desc">
          For multiple-choice questions: how often each option was chosen, overall and by the top and bottom 27% of
          students (by total score).
        </p>
      </div>
    </div>

    <div v-if="!analysis.available" class="empty-state">
      <p>
        Distractor analysis applies to multiple-choice questions: assessments with <code>question_subtype</code>
        <code>mcq</code> and a <code>correct_option</code> in the exam config, where the scores file holds the option each
        student chose. This exam has none.
      </p>
    </div>

    <template v-else>
      <div class="stat-cards-grid">
        <div class="stat-card"><span class="stat-label">Multiple-choice questions</span><span class="stat-value">{{ analysis.questions.length }}</span></div>
        <div class="stat-card">
          <span class="stat-label">With a flag</span>
          <span class="stat-value">{{ flaggedCount }}</span>
          <span class="stat-desc">rarely chosen options, a wrong option preferred by top students, or a wrong option chosen more than the key</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Group size</span>
          <span class="stat-value">{{ analysis.questions[0]?.groupSize }}</span>
          <span class="stat-desc">students in each of the top and bottom groups</span>
        </div>
      </div>

      <div class="card-box">
        <h3>Questions</h3>
        <p class="hint">Select a question to see its options.</p>
        <DataTable :columns="questionColumns" :rows="questionRows" row-key="id" clickable export-name="distractor-questions" @row-click="selectedId = $event.id">
          <template #cell-flags="{ row }">
            <span v-for="f in row.flags" :key="f.id" class="tag" :class="settings.showVerdicts ? `tag-${f.tone}` : 'tag-neutral'">{{ f.label }}</span>
          </template>
        </DataTable>
      </div>

      <div v-if="selected" class="card-box">
        <h3>{{ selected.id }} — options</h3>
        <p class="hint">
          Key: <strong>{{ selected.correctOption }}</strong> · {{ selected.answered }} answered, {{ selected.blank }} left blank.
          Percentages are of the students who answered.
        </p>
        <DataTable :columns="optionColumns" :rows="selected.options" row-key="option" :searchable="false" export-name="distractor-options">
          <template #cell-option="{ row }">
            <strong>{{ row.option }}</strong> <span v-if="row.isCorrect" class="tag tag-good">Key</span>
          </template>
          <template #cell-bar="{ row }"><Bar :value="row.pctOfAnswered" :color="row.isCorrect ? '#16a34a' : null" /></template>
          <template #cell-groups="{ row }"><PairBar :first="row.pctBottom" :second="row.pctTop" first-label="Bottom group" second-label="Top group" /></template>
        </DataTable>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, inject, ref } from 'vue'
import DataTable from '../components/DataTable.vue'
import Bar from '../components/Bar.vue'
import PairBar from '../components/PairBar.vue'
import { analyzeDistractors } from '../lib/distractors.js'
import { distractorFlags } from '../lib/verdicts.js'
import { formatPct as pct } from '../lib/format.js'

defineEmits(['open-student'])

const exam = inject('exam')
const settings = inject('settings')

const analysis = computed(() => analyzeDistractors(exam.value.dataset))

const questionRows = computed(() =>
  analysis.value.questions.map((q) => ({
    id: q.id,
    correctOption: q.correctOption,
    answered: q.answered,
    blank: q.blank,
    correctPctOfAnswered: q.correctPctOfAnswered,
    flags: distractorFlags(q, settings.value),
  }))
)
const flaggedCount = computed(() => questionRows.value.filter((r) => r.flags.length).length)
const questionColumns = [
  { key: 'id', label: 'Question', type: 'text' },
  { key: 'correctOption', label: 'Key', type: 'text' },
  { key: 'answered', label: 'Answered', type: 'number' },
  { key: 'blank', label: 'Blank', type: 'number' },
  { key: 'correctPctOfAnswered', label: 'Chose the key', type: 'number', format: (v) => pct(v) },
  { key: 'flags', label: 'Flags', type: 'text', value: (r) => r.flags.map((f) => f.label) },
]

const selectedId = ref('')
const selected = computed(() => analysis.value.questions.find((q) => q.id === selectedId.value) ?? analysis.value.questions[0] ?? null)
const optionColumns = [
  { key: 'option', label: 'Option', type: 'text' },
  { key: 'count', label: 'Students', type: 'number' },
  { key: 'pctOfAnswered', label: 'All answered', type: 'number', format: (v) => pct(v) },
  { key: 'bar', label: '', type: 'number', value: (r) => r.pctOfAnswered, filterable: false, sortable: false, exportable: false },
  { key: 'pctTop', label: 'Top group', type: 'number', format: (v) => pct(v) },
  { key: 'pctBottom', label: 'Bottom group', type: 'number', format: (v) => pct(v) },
  { key: 'groups', label: 'Bottom / top', type: 'number', value: (r) => r.pctTop, filterable: false, sortable: false, exportable: false },
]
</script>
