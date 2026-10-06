<template>
  <section class="view-panel">
    <div class="view-header">
      <div>
        <h2 class="view-title">Grade bands</h2>
        <p class="view-desc">
          Count students per band, see how many pass at any cutoff, and find students just below a cutoff. Changes on
          this page are for exploring only; the default bands are in Settings.
        </p>
      </div>
    </div>

    <div class="card-box">
      <h3>Bands</h3>
      <div class="bands-editor">
        <div v-for="(b, i) in bands" :key="i" class="band-row">
          <input v-model="b.label" type="text" aria-label="Band label" />
          <span class="unit">from</span>
          <input v-model.number="b.from" type="number" min="0" max="100" step="1" aria-label="Band lower limit" />
          <span class="unit">%</span>
          <button type="button" class="btn-sm btn-secondary" :disabled="bands.length <= 2" @click="bands.splice(i, 1)">Remove</button>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-sm btn-secondary" @click="addBand">Add band</button>
          <button type="button" class="btn-sm btn-secondary" @click="resetBands">Reset to settings</button>
        </div>
      </div>
      <div v-if="bandProblems.length" class="notice notice-error"><ul><li v-for="(p, i) in bandProblems" :key="i">{{ p }}</li></ul></div>
    </div>

    <template v-if="!bandProblems.length">
      <div class="card-box">
        <h3>Students per band</h3>
        <DataTable :columns="distributionColumns" :rows="distributionRows" row-key="label" :searchable="false" export-name="grade-bands">
          <template #cell-label="{ value }"><span class="badge badge-tier">{{ value }}</span></template>
          <template #cell-bar="{ row }"><Bar :value="row.percentage" /></template>
          <template #cell-who="{ row }"><StudentChips :students="row.chips" @select="$emit('open-student', $event)" /></template>
        </DataTable>
      </div>

      <div class="card-box">
        <h3>Cutoff explorer</h3>
        <div class="range-row">
          <label for="cutoff"><strong>Cutoff</strong></label>
          <input id="cutoff" v-model.number="cutoff" type="range" min="0" max="100" step="1" />
          <input v-model.number="cutoff" type="number" min="0" max="100" step="1" aria-label="Cutoff percentage" />
          <span>%</span>
          <button type="button" class="btn-sm btn-secondary" @click="cutoff = settings.attainment.passMark">Pass mark ({{ settings.attainment.passMark }}%)</button>
          <button type="button" class="btn-sm btn-secondary" @click="cutoff = settings.attainment.distinctionMark">Distinction mark ({{ settings.attainment.distinctionMark }}%)</button>
        </div>
        <div class="stat-cards-grid compact">
          <div class="stat-card"><span class="stat-label">At or above {{ cutoffClamped }}%</span><span class="stat-value">{{ atCutoff.count }}</span><span class="stat-desc">{{ pct(atCutoff.ratePct) }} of students</span></div>
          <div class="stat-card"><span class="stat-label">Below {{ cutoffClamped }}%</span><span class="stat-value">{{ students.length - atCutoff.count }}</span><span class="stat-desc">{{ pct(atCutoff.ratePct == null ? null : 100 - atCutoff.ratePct) }} of students</span></div>
        </div>
        <LineChart :labels="curve.map((c) => String(c.cutoff))" :series="[{ label: 'Students at or above the cutoff (%)', data: curve.map((c) => c.ratePct), color: '#2563eb' }]" y-label="% of students" />
      </div>

      <div class="card-box">
        <h3>Students just below the cutoff</h3>
        <div class="range-row">
          <label for="within">Within</label>
          <input id="within" v-model.number="within" type="number" min="0" max="100" step="1" />
          <span>points below {{ cutoffClamped }}%</span>
        </div>
        <DataTable :columns="borderlineColumns" :rows="borderline" row-key="id" clickable export-name="borderline-students" empty-text="No students in this range." @row-click="$emit('open-student', $event.id)" />
      </div>

      <div class="card-box">
        <h3>Students</h3>
        <DataTable :columns="studentColumns" :rows="studentRows" row-key="id" clickable export-name="students-bands" @row-click="$emit('open-student', $event.id)" />
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, inject, reactive, ref, watch } from 'vue'
import DataTable from '../components/DataTable.vue'
import Bar from '../components/Bar.vue'
import StudentChips from '../components/StudentChips.vue'
import LineChart from '../components/LineChart.vue'
import { assignBand, bandDistribution, borderlineStudents, cutoffCurve } from '../lib/bands.js'
import { cloneSettings, validateSettings, setPath } from '../lib/settings.js'
import { formatNumber as num, formatPct as pct } from '../lib/format.js'

defineEmits(['open-student'])

const exam = inject('exam')
const settings = inject('settings')

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
