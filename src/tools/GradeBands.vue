<template>
  <div class="flex flex-col gap-6">
    <PageHeader help="page.bands"
      title="Grade bands"
      description="Count students per band, see how many pass at any cutoff, and find students just below a cutoff. Changes on this page are for exploring only; the default bands are in Settings."
    />

    <SectionCard title="Bands" help="bands.bands">
      <BandsEditor v-model="bands" />
      <div>
        <Button variant="outline" size="sm" @click="resetBands">Reset to settings</Button>
      </div>
      <NoticeAlert v-if="bandProblems.length" kind="error">
        <ul class="list-disc pl-5"><li v-for="(p, i) in bandProblems" :key="i">{{ p }}</li></ul>
      </NoticeAlert>
    </SectionCard>

    <template v-if="!bandProblems.length">
      <SectionCard title="Students per band" help="bands.perband">
        <DataTable :columns="distributionColumns" :rows="distributionRows" row-key="label" :searchable="false" export-name="grade-bands">
          <template #cell-label="{ value }"><TierBadge :tier="value" class="normal-case" /></template>
          <template #cell-bar="{ row }"><Bar :value="row.percentage" /></template>
          <template #cell-who="{ row }"><StudentChips :students="row.chips" @select="openStudent" /></template>
        </DataTable>
      </SectionCard>

      <SectionCard title="Cutoff explorer" help="bands.cutoff">
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-sm font-semibold">Cutoff</span>
          <Slider :model-value="[cutoffClamped]" :min="0" :max="100" :step="1" class="min-w-56 flex-1" aria-label="Cutoff percentage" @update:model-value="(v) => (cutoff = v[0])" />
          <NumberInput v-model="cutoff" :min="0" :max="100" :step="1" class="w-20" aria-label="Cutoff percentage value" />
          <span class="text-sm">%</span>
          <Button variant="outline" size="sm" @click="cutoff = settings.attainment.passMark">Pass mark ({{ settings.attainment.passMark }}%)</Button>
          <Button variant="outline" size="sm" @click="cutoff = settings.attainment.distinctionMark">Distinction mark ({{ settings.attainment.distinctionMark }}%)</Button>
        </div>
        <StatGrid compact>
          <StatCard :label="`At or above ${cutoffClamped}%`" :value="atCutoff.count" :description="`${pct(atCutoff.ratePct)} of students`" />
          <StatCard :label="`Below ${cutoffClamped}%`" :value="students.length - atCutoff.count" :description="`${pct(atCutoff.ratePct == null ? null : 100 - atCutoff.ratePct)} of students`" />
        </StatGrid>
        <LineChart :labels="curve.map((c) => String(c.cutoff))" :series="[{ label: 'Students at or above the cutoff (%)', data: curve.map((c) => c.ratePct), color: '#2563eb' }]" y-label="% of students" />
      </SectionCard>

      <SectionCard title="Students just below the cutoff" help="bands.borderline">
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <label for="within">Within</label>
          <NumberInput id="within" v-model="within" :min="0" :max="100" :step="1" class="w-20" />
          <span>points below {{ cutoffClamped }}%</span>
        </div>
        <DataTable :columns="borderlineColumns" :rows="borderline" row-key="id" clickable export-name="borderline-students" empty-text="No students in this range." @row-click="openStudent($event.id)" />
      </SectionCard>

      <SectionCard title="Students" help="bands.students">
        <DataTable :columns="studentColumns" :rows="studentRows" row-key="id" clickable export-name="students-bands" @row-click="openStudent($event.id)" />
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
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import BandsEditor from '@/components/display/BandsEditor.vue'
import NoticeAlert from '@/components/common/NoticeAlert.vue'
import NumberInput from '@/components/common/NumberInput.vue'
import TierBadge from '@/components/common/TierBadge.vue'
import { storeToRefs } from 'pinia'
import { useSessionStore } from '@/stores/session.js'
import { useSettingsStore } from '@/stores/settings.js'
import { computed, reactive, ref, watch } from 'vue'
import DataTable from '@/components/display/DataTable.vue'
import Bar from '@/components/display/Bar.vue'
import StudentChips from '@/components/display/StudentChips.vue'
import LineChart from '@/components/charts/LineChart.vue'
import { assignBand, bandDistribution, borderlineStudents, cutoffCurve } from '@/lib/bands.js'
import { cloneSettings, validateSettings, setPath } from '@/lib/settings.js'
import { formatNumber as num, formatPct as pct } from '@/lib/format.js'

const sessionStore = useSessionStore()
const { exam } = storeToRefs(sessionStore)
const { openStudent } = sessionStore
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)


const students = computed(() => exam.value.profiles.students)

const bands = reactive(cloneSettings(settings.value.bands))
const resetBands = () => bands.splice(0, bands.length, ...cloneSettings(settings.value.bands))
watch(() => settings.value.bands, resetBands, { deep: true })
const addBand = () => {
  const used = new Set(bands.map((b) => b.from))
  bands.push({ label: `Band ${bands.length + 1}`, from: [...Array(99).keys()].map((i) => i + 1).find((v) => !used.has(v)) ?? 1 })
}

// The same checks as the Settings page, applied to this page's bands.
const bandProblems = computed(() => validateSettings(setPath(settings.value, 'bands', cloneSettings(bands))).filter((e) => e.includes('bands')))

const names = computed(() => new Map(students.value.map((s) => [s.id, s])))
const distribution = computed(() => bandDistribution(students.value, bands))
const sectionNames = computed(() => [...new Set(students.value.map((s) => s.section).filter((s) => s != null))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })))

const distributionRows = computed(() =>
  distribution.value.map((b) => ({
    ...b,
    range: `${b.from}% to ${b.to === 100 ? '100%' : `under ${b.to}%`}`,
    chips: b.studentIds.map((id) => ({ id, label: `${names.value.get(id).name} (${pct(names.value.get(id).masteryPct)})` })),
    ...Object.fromEntries(sectionNames.value.map((name) => [`sec-${name}`, b.studentIds.filter((id) => names.value.get(id).section === name).length])),
  }))
)
const distributionColumns = computed(() => [
  { key: 'label', label: 'Band', type: 'text' },
  { key: 'range', label: 'Mastery range', type: 'text', value: (r) => r.from },
  { key: 'count', label: 'Students', type: 'number' },
  { key: 'percentage', label: '% of students', type: 'number', format: (v) => pct(v) },
  { key: 'bar', label: '', type: 'number', value: (r) => r.percentage, filterable: false, sortable: false, exportable: false },
  ...sectionNames.value.map((name) => ({ key: `sec-${name}`, label: `Section ${name}`, type: 'number' })),
  { key: 'who', label: 'Who', type: 'text', value: (r) => r.chips.map((c) => c.label) },
])

const cutoff = ref(settings.value.attainment.passMark)
const cutoffClamped = computed(() => Math.max(0, Math.min(100, Number.isFinite(cutoff.value) ? Math.round(cutoff.value) : 0)))
const curve = computed(() => cutoffCurve(students.value.map((s) => s.masteryPct ?? 0)))
const atCutoff = computed(() => curve.value[cutoffClamped.value])

const within = ref(5)
const borderline = computed(() => borderlineStudents(students.value, cutoffClamped.value, Number.isFinite(within.value) ? within.value : 0))
const borderlineColumns = [
  { key: 'id', label: 'ID', type: 'text' },
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'masteryPct', label: 'Mastery', type: 'number', format: (v) => pct(v) },
  { key: 'shortfallPp', label: 'Below cutoff by', type: 'number', format: (v) => `${num(v)} pp` },
  { key: 'marksShort', label: 'Marks short', type: 'number', format: (v) => num(v) },
]

const studentRows = computed(() => students.value.map((s) => ({ id: s.id, name: s.name, section: s.section, masteryPct: s.masteryPct, band: assignBand(s.masteryPct, bands) })))
const studentColumns = [
  { key: 'id', label: 'ID', type: 'text' },
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'section', label: 'Section', type: 'text' },
  { key: 'masteryPct', label: 'Mastery', type: 'number', format: (v) => pct(v) },
  { key: 'band', label: 'Band', type: 'text' },
]
</script>
