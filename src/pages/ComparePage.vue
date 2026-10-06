<template>
  <div class="flex flex-col gap-6">
    <PageHeader help="page.compare"
      title="Compare exams"
      description="Compare two saved exams: cohort, dimensions, and students matched by student_id. Changes are later minus earlier, in percentage points."
    />

    <SectionCard title="Exams" help="compare.exams">
      <div class="grid gap-4 md:grid-cols-2">
        <Field label="Earlier exam" html-for="compareBase">
          <SelectField id="compareBase" v-model="baseId" :options="choices" placeholder="Select an exam" aria-label="Earlier exam" />
        </Field>
        <Field label="Later exam" html-for="compareLater">
          <SelectField id="compareLater" v-model="laterId" :options="choices" placeholder="Select an exam" aria-label="Later exam" />
        </Field>
      </div>
      <div><Button :disabled="!baseId || !laterId" @click="run">Compare</Button></div>
    </SectionCard>

    <template v-if="result">
      <StatGrid>
        <StatCard label="Cohort mastery" :value="`${pct(result.cohort.basePct)} → ${pct(result.cohort.laterPct)}`">
          <template #description>
            {{ signed(result.cohort.deltaPp, ' pp') }}
            <VerdictTag :verdict="V.trendVerdict(result.cohort.deltaPp, settings)" />
          </template>
        </StatCard>
        <StatCard label="Students" :value="`${result.cohort.baseStudents} → ${result.cohort.laterStudents}`" :description="`${result.students.length} matched by student_id`" />
      </StatGrid>
      <p v-if="result.unmatched.onlyInBase.length || result.unmatched.onlyInLater.length" class="text-sm text-muted-foreground">
        Only in the earlier exam: {{ result.unmatched.onlyInBase.length }} student(s). Only in the later exam:
        {{ result.unmatched.onlyInLater.length }} student(s). They are left out of the student table.
      </p>
      <SectionCard title="Dimensions" help="compare.dimensions">
        <DataTable :columns="dimensionColumns" :rows="result.dimensions" row-key="dimension" :searchable="false" export-name="compare-dimensions">
          <template #cell-dimension="{ value }"><DimensionBadge :dimension="value" /></template>
          <template #cell-bars="{ row }"><PairBar :first="row.basePct" :second="row.laterPct" first-label="Earlier" second-label="Later" :color="dimensionColor(row.dimension)" /></template>
        </DataTable>
      </SectionCard>
      <SectionCard title="Students" help="compare.students">
        <DataTable :columns="studentColumns" :rows="result.students" row-key="id" export-name="compare-students" />
      </SectionCard>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import { Button } from '@/components/ui/button'
import DataTable from '@/components/display/DataTable.vue'
import PairBar from '@/components/display/PairBar.vue'
import VerdictTag from '@/components/display/VerdictTag.vue'
import DimensionBadge from '@/components/common/DimensionBadge.vue'
import Field from '@/components/common/Field.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import SelectField from '@/components/common/SelectField.vue'
import StatCard from '@/components/common/StatCard.vue'
import StatGrid from '@/components/common/StatGrid.vue'
import { analyzeDataset } from '@/lib/analysis.js'
import { dimensionColor } from '@/lib/colors.js'
import { compareExams } from '@/lib/compare.js'
import { formatPct as pct, formatSigned as signed } from '@/lib/format.js'
import * as V from '@/lib/verdicts.js'
import * as api from '@/api.js'
import { useNoticeStore } from '@/stores/notice.js'
import { useSessionStore } from '@/stores/session.js'
import { useSettingsStore } from '@/stores/settings.js'

const sessionStore = useSessionStore()
const { savedExams } = storeToRefs(sessionStore)
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
const noticeStore = useNoticeStore()
const { fail, notify } = noticeStore

const baseId = ref(undefined)
const laterId = ref(undefined)
const result = shallowRef(null)

const choices = computed(() => savedExams.value.map((e) => ({ value: e.id, label: `${e.courseName} — ${e.examTitle} (${e.examDate})` })))

async function run() {
  result.value = null
  if (baseId.value === laterId.value) {
    notify('error', 'Choose two different exams to compare.')
    return
  }
  try {
    const [a, b] = await Promise.all([api.getExam(baseId.value), api.getExam(laterId.value)])
    for (const saved of [a, b]) {
      if (!saved.dataset?.questions || !saved.dataset?.students) {
        throw new Error(`"${saved.examTitle}" was saved in an older, incompatible format. Upload its CSV files again.`)
      }
    }
    result.value = compareExams(analyzeDataset(a.dataset).profiles, analyzeDataset(b.dataset).profiles)
  } catch (err) {
    fail(err)
  }
}

const trendColumn = { key: 'trend', label: 'Trend', type: 'text', verdict: (r) => V.trendVerdict(r.deltaPp, settings.value) }
const dimensionColumns = [
  { key: 'dimension', label: 'Dimension', type: 'text' },
  { key: 'basePct', label: 'Earlier', type: 'number', format: (v) => pct(v) },
  { key: 'laterPct', label: 'Later', type: 'number', format: (v) => pct(v) },
  { key: 'deltaPp', label: 'Change', type: 'number', format: (v) => signed(v, ' pp') },
  trendColumn,
  { key: 'bars', label: 'Earlier / later', type: 'number', value: (r) => r.laterPct, filterable: false, sortable: false, exportable: false },
]
const studentColumns = computed(() => [
  { key: 'id', label: 'ID', type: 'text' },
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'baseMasteryPct', label: 'Earlier mastery', type: 'number', format: (v) => pct(v) },
  { key: 'laterMasteryPct', label: 'Later mastery', type: 'number', format: (v) => pct(v) },
  { key: 'deltaPp', label: 'Change', type: 'number', format: (v) => signed(v, ' pp') },
  trendColumn,
  ...(result.value?.dimensions ?? []).map((d) => ({
    key: `delta-${d.dimension}`,
    label: `${d.dimension} change`,
    type: 'number',
    value: (r) => r.dimensions[d.dimension]?.deltaPp ?? null,
    format: (v) => signed(v, ' pp'),
  })),
])
</script>
