<template>
  <div class="flex flex-col gap-6">
    <PageHeader help="page.distractors"
      title="Distractors"
      description="For multiple-choice questions: how often each option was chosen, overall and by the top and bottom 27% of students (by total score)."
    />

    <EmptyState v-if="!analysis.available">
      Distractor analysis applies to multiple-choice questions: assessments with <code class="rounded bg-muted px-1">question_subtype</code>
      <code class="rounded bg-muted px-1">mcq</code> and a <code class="rounded bg-muted px-1">correct_option</code> in the exam config, where the
      scores file holds the option each student chose. This exam has none.
    </EmptyState>

    <template v-else>
      <StatGrid>
        <StatCard label="Multiple-choice questions" :value="analysis.questions.length" />
        <StatCard
          label="With a flag"
          :value="flaggedCount"
          description="rarely chosen options, a wrong option preferred by top students, or a wrong option chosen more than the key"
        />
        <StatCard label="Group size" :value="analysis.questions[0]?.groupSize" description="students in each of the top and bottom groups" />
      </StatGrid>

      <SectionCard title="Questions" help="distractors.questions" description="Select a question to see its options.">
        <DataTable :columns="questionColumns" :rows="questionRows" row-key="id" clickable export-name="distractor-questions" @row-click="selectedId = $event.id">
          <template #cell-flags="{ row }"><ReasonTags :reasons="row.flags" /></template>
        </DataTable>
      </SectionCard>

      <SectionCard v-if="selected" :title="`${selected.id} — options`" help="distractors.options">
        <template #description>
          Key: <strong>{{ selected.correctOption }}</strong> · {{ selected.answered }} answered, {{ selected.blank }} left blank.
          Percentages are of the students who answered.
        </template>
        <DataTable :columns="optionColumns" :rows="selected.options" row-key="option" :searchable="false" export-name="distractor-options">
          <template #cell-option="{ row }">
            <span class="inline-flex items-center gap-1.5">
              <strong>{{ row.option }}</strong>
              <VerdictTag v-if="row.isCorrect" :verdict="{ label: 'Key', tone: 'good' }" />
            </span>
          </template>
          <template #cell-bar="{ row }"><Bar :value="row.pctOfAnswered" :color="row.isCorrect ? '#16a34a' : null" /></template>
          <template #cell-groups="{ row }"><PairBar :first="row.pctBottom" :second="row.pctTop" first-label="Bottom group" second-label="Top group" /></template>
        </DataTable>
      </SectionCard>
    </template>
  </div>
</template>

<script setup>
import PageHeader from '@/components/common/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import StatCard from '@/components/common/StatCard.vue'
import StatGrid from '@/components/common/StatGrid.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ReasonTags from '@/components/display/ReasonTags.vue'
import { storeToRefs } from 'pinia'
import { useSessionStore } from '@/stores/session.js'
import { useSettingsStore } from '@/stores/settings.js'
import { computed, ref } from 'vue'
import DataTable from '@/components/display/DataTable.vue'
import Bar from '@/components/display/Bar.vue'
import PairBar from '@/components/display/PairBar.vue'
import { analyzeDistractors } from '@/lib/distractors.js'
import { distractorFlags } from '@/lib/verdicts.js'
import { formatPct as pct } from '@/lib/format.js'

const sessionStore = useSessionStore()
const { exam } = storeToRefs(sessionStore)
const { openStudent } = sessionStore
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)


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
