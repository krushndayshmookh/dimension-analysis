<template>
  <div class="flex flex-col gap-6">
    <PageHeader title="Cohort overview" :description="`${exam.courseName} · ${exam.examTitle} · ${exam.examDate}`" />

    <StatGrid>
      <StatCard label="Students" :value="profiles.cohort.studentCount" :description="profiles.cohort.absentCount ? `${profiles.cohort.absentCount} absent (scored 0)` : undefined" />
      <StatCard label="Average score" :value="`${num(profiles.cohort.earned)} / ${num(profiles.totalMarks)}`" />
      <StatCard label="Mastery" :value="pct(profiles.cohort.masteryPct)">
        <template #description>
          marks earned ÷ all exam marks
          <VerdictTag :verdict="V.difficultyVerdict(profiles.cohort.masteryPct, settings)" />
        </template>
      </StatCard>
      <StatCard label="Accuracy" :value="pct(profiles.cohort.accuracyPct)" description="marks earned ÷ marks of attempted questions" />
      <StatCard label="At or above pass mark" :value="`${attainment.pass.count} / ${attainment.studentCount}`" :description="`${pct(attainment.pass.ratePct)} (pass mark ${settings.attainment.passMark}%)`" />
      <StatCard label="At or above distinction mark" :value="`${attainment.distinction.count} / ${attainment.studentCount}`" :description="`${pct(attainment.distinction.ratePct)} (distinction mark ${settings.attainment.distinctionMark}%)`" />
    </StatGrid>

    <div class="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Cohort mastery by dimension">
        <RadarChart :values="radar" label="Cohort mastery %" />
      </SectionCard>
      <SectionCard title="Dimensions">
        <DataTable :columns="dimensionColumns" :rows="dimensionRows" row-key="dimension" :searchable="false" export-name="cohort-dimensions">
          <template #cell-dimension="{ value }"><DimensionBadge :dimension="value" /></template>
          <template #cell-bar="{ row }"><Bar :value="row.masteryPct" :color="dimensionColor(row.dimension)" /></template>
        </DataTable>
      </SectionCard>
    </div>

    <SectionCard title="Students needing attention">
      <template #description>
        Below the pass mark, within {{ settings.attention.nearPassMarginPp }} points above it, or weak in
        {{ settings.attention.weakDimensionCount }} or more dimensions. Thresholds are set in Settings.
      </template>
      <DataTable
        :columns="attentionColumns"
        :rows="attentionRows"
        row-key="id"
        clickable
        export-name="students-needing-attention"
        empty-text="No students match the attention rules."
        @row-click="openStudent($event.id)"
      >
        <template #cell-reasons="{ row }"><ReasonTags :reasons="row.reasons" /></template>
      </DataTable>
    </SectionCard>

    <SectionCard title="Students">
      <template #description>
        Select a row to open the student profile. Rank 1 is the highest mastery; percentile is the share of students
        scoring lower (ties count half).
      </template>
      <DataTable
        :columns="studentColumns"
        :rows="profiles.students"
        row-key="id"
        clickable
        export-name="students"
        :default-sort="{ key: 'id', dir: 'asc' }"
        @row-click="openStudent($event.id)"
      />
    </SectionCard>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import Bar from '@/components/display/Bar.vue'
import DataTable from '@/components/display/DataTable.vue'
import ReasonTags from '@/components/display/ReasonTags.vue'
import VerdictTag from '@/components/display/VerdictTag.vue'
import RadarChart from '@/components/charts/RadarChart.vue'
import DimensionBadge from '@/components/common/DimensionBadge.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import StatCard from '@/components/common/StatCard.vue'
import StatGrid from '@/components/common/StatGrid.vue'
import { dimensionColor } from '@/lib/colors.js'
import { formatNumber as num, formatPct as pct } from '@/lib/format.js'
import * as V from '@/lib/verdicts.js'
import { useSessionStore } from '@/stores/session.js'
import { useSettingsStore } from '@/stores/settings.js'

const sessionStore = useSessionStore()
const { exam, profiles } = storeToRefs(sessionStore)
const { openStudent } = sessionStore
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const radar = computed(() => Object.fromEntries(profiles.value.dimensions.map((d) => [d, profiles.value.cohort.dimensions[d].masteryPct])))
const dimensionRows = computed(() => profiles.value.dimensions.map((d) => ({ dimension: d, ...profiles.value.cohort.dimensions[d] })))
const masteryLevel = (row) => V.masteryVerdict(row.masteryPct, settings.value)
const dimensionColumns = [
  { key: 'dimension', label: 'Dimension', type: 'text' },
  { key: 'availableExam', label: 'Marks available', type: 'number', format: (v) => num(v) },
  { key: 'earned', label: 'Avg earned', type: 'number', format: (v) => num(v) },
  { key: 'masteryPct', label: 'Mastery', type: 'number', format: (v) => pct(v) },
  { key: 'level', label: 'Level', type: 'text', verdict: masteryLevel },
  { key: 'accuracyPct', label: 'Accuracy', type: 'number', format: (v) => pct(v) },
  { key: 'bar', label: '', type: 'number', value: (r) => r.masteryPct, filterable: false, sortable: false, exportable: false },
]

const attainment = computed(() => V.attainmentRates(profiles.value.students.map((s) => s.masteryPct ?? 0), settings.value))

// A student's level in a dimension, comparing with the cohort when that setting is on.
const dimensionLevel = (student, dimension) =>
  V.studentLevel(student.dimensions[dimension]?.masteryPct, profiles.value.cohort.dimensions[dimension]?.masteryPct, settings.value)

const attentionRows = computed(() =>
  profiles.value.students
    .map((s) => ({
      id: s.id,
      name: s.name,
      masteryPct: s.masteryPct,
      reasons: V.attentionReasons(s, profiles.value.cohort, settings.value),
      weakDimensions: profiles.value.dimensions.filter((d) => dimensionLevel(s, d)?.level === 'weak'),
    }))
    .filter((r) => r.reasons.length)
)
const attentionColumns = [
  { key: 'id', label: 'ID', type: 'text' },
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'masteryPct', label: 'Mastery', type: 'number', format: (v) => pct(v) },
  { key: 'reasons', label: 'Why', type: 'text', value: (r) => r.reasons.map((x) => x.label) },
  { key: 'weakDimensions', label: 'Weak dimensions', type: 'text' },
]

const studentColumns = computed(() => [
  { key: 'id', label: 'ID', type: 'text' },
  { key: 'name', label: 'Name', type: 'text' },
  ...(profiles.value.students.some((s) => s.section != null) ? [{ key: 'section', label: 'Section', type: 'text' }] : []),
  { key: 'earned', label: 'Score', type: 'number', format: (v, r) => `${num(v)} / ${num(r.totalMarks)}` },
  { key: 'masteryPct', label: 'Mastery', type: 'number', format: (v) => pct(v) },
  { key: 'level', label: 'Level', type: 'text', verdict: masteryLevel },
  { key: 'accuracyPct', label: 'Accuracy', type: 'number', format: (v) => pct(v) },
  { key: 'rank', label: 'Rank', type: 'number' },
  { key: 'percentile', label: 'Percentile', type: 'number', format: (v) => num(v) },
  { key: 'zScore', label: 'z-score', type: 'number', format: (v) => num(v, 2) },
  ...profiles.value.dimensions.map((d) => ({
    key: `dim-${d}`,
    label: d,
    type: 'number',
    value: (r) => r.dimensions[d].masteryPct,
    format: (v) => pct(v),
    dot: (r) => dimensionLevel(r, d),
  })),
  { key: 'weakestDimension', label: 'Lowest dimension', type: 'text' },
  { key: 'strongestDimension', label: 'Highest dimension', type: 'text' },
])
</script>
