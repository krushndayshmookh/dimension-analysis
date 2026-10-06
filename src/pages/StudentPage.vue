<template>
  <div class="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
    <StudentSidebar v-model="selectedStudentId" :items="items" />

    <div class="flex min-w-0 flex-col gap-6">
      <PageHeader title="Student profile" />

      <template v-if="student">
        <SectionCard title="Radar metric">
          <ToggleGroup v-model="metric" type="single" variant="outline" size="sm" class="w-fit" @update:model-value="(v) => !v && (metric = 'mastery')">
            <ToggleGroupItem value="mastery">Mastery (earned ÷ all marks)</ToggleGroupItem>
            <ToggleGroupItem value="accuracy">Accuracy (earned ÷ attempted marks)</ToggleGroupItem>
          </ToggleGroup>
        </SectionCard>

        <div class="grid gap-4 xl:grid-cols-2">
          <SectionCard :title="`${student.name} vs cohort`">
            <RadarChart :values="studentRadar" :label="student.name" :reference-values="cohortRadar" reference-label="Cohort average" />
          </SectionCard>

          <SectionCard :title="`${student.name} (${student.id})`">
            <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Highlight label="Marks earned">{{ num(student.earned) }} / {{ num(student.totalMarks) }}</Highlight>
              <Highlight label="Attempted marks">{{ num(student.attemptedMarks) }}</Highlight>
              <Highlight label="Mastery">{{ pct(student.masteryPct) }}</Highlight>
              <Highlight label="Accuracy">{{ pct(student.accuracyPct) }}</Highlight>
              <Highlight label="Rank">{{ student.rank }} of {{ profiles.students.length }}</Highlight>
              <Highlight label="Percentile / z-score">{{ num(student.percentile) }} <span class="text-muted-foreground">/ {{ num(student.zScore, 2) }}</span></Highlight>
              <Highlight label="Highest-mastery dimension">
                <span class="flex flex-wrap items-center gap-1.5">
                  <DimensionBadge v-if="student.strongestDimension" :dimension="student.strongestDimension" />
                  <span class="text-muted-foreground">{{ pct(student.dimensions[student.strongestDimension]?.masteryPct) }}</span>
                  <VerdictTag :verdict="dimensionLevel(student.strongestDimension)" />
                </span>
              </Highlight>
              <Highlight label="Lowest-mastery dimension">
                <span class="flex flex-wrap items-center gap-1.5">
                  <DimensionBadge v-if="student.weakestDimension" :dimension="student.weakestDimension" />
                  <span class="text-muted-foreground">{{ pct(student.dimensions[student.weakestDimension]?.masteryPct) }}</span>
                  <VerdictTag :verdict="dimensionLevel(student.weakestDimension)" />
                </span>
              </Highlight>
              <Highlight label="Needs attention">
                <span class="flex flex-wrap items-center gap-1.5">
                  <VerdictTag v-for="r in attention" :key="r.id" :verdict="r" />
                  <span v-if="!attention.length" class="text-muted-foreground">No</span>
                </span>
              </Highlight>
            </dl>
            <div>
              <Button variant="outline" @click="openHistory(student.id)"><HistoryIcon /> Longitudinal history</Button>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Dimensions">
          <DataTable :columns="breakdownColumns('Dimension')" :rows="breakdown('dimensions')" row-key="name" :searchable="false" export-name="student-dimensions">
            <template #cell-name="{ value }"><DimensionBadge :dimension="value" /></template>
            <template #cell-vsCohort="{ value }">{{ signed(value, ' pp') }}</template>
          </DataTable>
        </SectionCard>
        <SectionCard title="Difficulty tiers">
          <DataTable :columns="breakdownColumns('Tier')" :rows="breakdown('difficulties')" row-key="name" :searchable="false" export-name="student-tiers">
            <template #cell-name="{ value }"><TierBadge :tier="value" /></template>
            <template #cell-vsCohort="{ value }">{{ signed(value, ' pp') }}</template>
          </DataTable>
        </SectionCard>
        <SectionCard title="Topics">
          <DataTable :columns="breakdownColumns('Topic')" :rows="breakdown('topics')" row-key="name" export-name="student-topics">
            <template #cell-vsCohort="{ value }">{{ signed(value, ' pp') }}</template>
          </DataTable>
        </SectionCard>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { HistoryIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import DataTable from '@/components/display/DataTable.vue'
import StudentSidebar from '@/components/display/StudentSidebar.vue'
import VerdictTag from '@/components/display/VerdictTag.vue'
import RadarChart from '@/components/charts/RadarChart.vue'
import DimensionBadge from '@/components/common/DimensionBadge.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import TierBadge from '@/components/common/TierBadge.vue'
import { formatNumber as num, formatPct as pct, formatSigned as signed } from '@/lib/format.js'
import * as V from '@/lib/verdicts.js'
import { useSessionStore } from '@/stores/session.js'
import { useSettingsStore } from '@/stores/settings.js'

const sessionStore = useSessionStore()
const { profiles, selectedStudentId } = storeToRefs(sessionStore)
const { openHistory } = sessionStore
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

// A label above a value, used in the highlights grid.
const Highlight = defineComponent({
  props: { label: String },
  setup: (props, { slots }) => () =>
    h('div', [h('dt', { class: 'text-xs uppercase tracking-wide text-muted-foreground' }, props.label), h('dd', { class: 'font-semibold' }, slots.default?.())]),
})

const metric = ref('mastery')
const student = computed(() => profiles.value.students.find((s) => s.id === selectedStudentId.value) ?? null)

const items = computed(() =>
  profiles.value.students.map((s) => ({
    id: s.id,
    name: s.name,
    section: s.section,
    detail: pct(s.masteryPct),
    tone: V.masteryVerdict(s.masteryPct, settings.value)?.tone ?? null,
  }))
)

const metricKey = computed(() => (metric.value === 'accuracy' ? 'accuracyPct' : 'masteryPct'))
const radarOf = (breakdowns) => Object.fromEntries(profiles.value.dimensions.map((d) => [d, breakdowns[d][metricKey.value]]))
const studentRadar = computed(() => radarOf(student.value.dimensions))
const cohortRadar = computed(() => radarOf(profiles.value.cohort.dimensions))

const dimensionLevel = (dimension) =>
  V.studentLevel(student.value.dimensions[dimension]?.masteryPct, profiles.value.cohort.dimensions[dimension]?.masteryPct, settings.value)
const attention = computed(() => V.attentionReasons(student.value, profiles.value.cohort, settings.value))

const breakdown = (group) =>
  profiles.value[group].map((name) => {
    const own = student.value[group][name]
    const ref = profiles.value.cohort[group][name]
    return {
      name,
      earned: own.earned,
      availableExam: own.availableExam,
      availableAttempted: own.availableAttempted,
      masteryPct: own.masteryPct,
      accuracyPct: own.accuracyPct,
      cohortPct: ref.masteryPct,
      vsCohort: own.masteryPct == null || ref.masteryPct == null ? null : Math.round((own.masteryPct - ref.masteryPct) * 100) / 100,
    }
  })

const breakdownColumns = (label) => [
  { key: 'name', label, type: 'text' },
  { key: 'earned', label: 'Earned', type: 'number', format: (v) => num(v) },
  { key: 'availableExam', label: 'Exam marks', type: 'number', format: (v) => num(v) },
  { key: 'availableAttempted', label: 'Attempted marks', type: 'number', format: (v) => num(v) },
  { key: 'masteryPct', label: 'Mastery', type: 'number', format: (v) => pct(v) },
  { key: 'level', label: 'Level', type: 'text', verdict: (r) => V.studentLevel(r.masteryPct, r.cohortPct, settings.value) },
  { key: 'accuracyPct', label: 'Accuracy', type: 'number', format: (v) => pct(v) },
  { key: 'cohortPct', label: 'Cohort mastery', type: 'number', format: (v) => pct(v) },
  { key: 'vsCohort', label: 'vs cohort', type: 'number' },
]
</script>
