<template>
  <section class="view-panel">
    <div class="view-header">
      <div>
        <h2 class="view-title">Sections</h2>
        <p class="view-desc">
          Compare sections (batches) on every measure. Sections come from the optional <code>section</code> column of the
          student file.
        </p>
      </div>
    </div>

    <div v-if="!analysis.hasSections" class="empty-state">
      <p>No student in this exam has a section. Add a <code>section</code> column to the student details file and upload again.</p>
    </div>

    <template v-else>
      <div class="stat-cards-grid">
        <div class="stat-card">
          <span class="stat-label">Sections</span>
          <span class="stat-value">{{ analysis.sections.length }}</span>
          <span class="stat-desc">{{ profiles.students.length }} students</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Highest section mean</span>
          <span class="stat-value">{{ highest?.name ?? '—' }}</span>
          <span class="stat-desc">{{ pct(highest?.mastery.mean) }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Lowest section mean</span>
          <span class="stat-value">{{ lowest?.name ?? '—' }}</span>
          <span class="stat-desc">{{ pct(lowest?.mastery.mean) }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Spread between them</span>
          <span class="stat-value">{{ num(spread) }} pp</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Do sections differ? (ANOVA)</span>
          <span class="stat-value">{{ analysis.anova ? `p = ${analysis.anova.p}` : '—' }}</span>
          <span class="stat-desc">
            <template v-if="analysis.anova">F({{ analysis.anova.df1 }}, {{ analysis.anova.df2 }}) = {{ analysis.anova.f }}</template>
            <template v-else>not enough data for the test</template>
            <VerdictTag :verdict="V.differenceVerdict(analysis.anova?.p, settings)" />
          </span>
        </div>
      </div>

      <div class="card-box">
        <h3>Overall</h3>
        <p class="hint">
          Difference from cohort = section mean minus cohort mean. Effect size is Cohen's d against all other students
          (about 0.2 small, 0.5 medium, 0.8 large). Pass and distinction marks come from Settings.
        </p>
        <DataTable :columns="overviewColumns" :rows="overviewRows" row-key="name" :searchable="false" export-name="sections-overview">
          <template #cell-name="{ row }"><span class="swatch" :style="{ background: colorOf(row.name) }"></span>{{ row.name }}</template>
        </DataTable>
      </div>

      <div class="card-box">
        <h3>Dimension balance by section</h3>
        <RadarChart :series="radarSeries" />
      </div>

      <div class="card-box">
        <h3>Score distribution by section</h3>
        <p class="hint">Share of each section's students in each decile of mastery.</p>
        <LineChart :labels="decileLabels" :series="distributionSeries" y-label="% of the section's students" :y-max="100" />
      </div>

      <div class="card-box">
        <h3>Mean mastery by dimension</h3>
        <p class="hint">
          The p-value tests whether the sections' means for that dimension differ (one-way ANOVA). With few students per
          section treat it as indicative only.
        </p>
        <DataTable :columns="dimensionColumns" :rows="dimensionRows" row-key="name" :searchable="false" export-name="sections-dimensions">
          <template #cell-name="{ value }"><span class="badge" :class="dimClass(value)">{{ value }}</span></template>
        </DataTable>
      </div>

      <div class="card-box">
        <h3>Mean mastery by difficulty tier</h3>
        <DataTable :columns="tierColumns" :rows="tierRows" row-key="name" :searchable="false" export-name="sections-tiers">
          <template #cell-name="{ value }"><span class="badge badge-tier">{{ value }}</span></template>
        </DataTable>
      </div>

      <div class="card-box">
        <h3>Students</h3>
        <DataTable :columns="studentColumns" :rows="profiles.students" row-key="id" clickable export-name="students-by-section" @row-click="$emit('open-student', $event.id)" />
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, inject } from 'vue'
import DataTable from '../components/DataTable.vue'
import VerdictTag from '../components/VerdictTag.vue'
import RadarChart from '../components/charts/RadarChart.vue'
import LineChart from '../components/charts/LineChart.vue'
import { analyzeSections } from '../lib/sections.js'
import * as V from '../lib/verdicts.js'
import { dimensionClass as dimClass } from '../lib/colors.js'
import { formatNumber as num, formatPct as pct, formatSigned as signed } from '../lib/format.js'

defineEmits(['open-student'])

const exam = inject('exam')
const settings = inject('settings')

const profiles = computed(() => exam.value.profiles)
const analysis = computed(() => analyzeSections(profiles.value))

const PALETTE = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#ea580c']
const colorOf = (name) => PALETTE[Math.max(0, analysis.value.sections.findIndex((s) => s.name === name)) % PALETTE.length]

const ranked = computed(() => analysis.value.sections.filter((s) => s.mastery.mean != null))
const highest = computed(() => ranked.value.reduce((a, b) => (b.mastery.mean > a.mastery.mean ? b : a), ranked.value[0]))
const lowest = computed(() => ranked.value.reduce((a, b) => (b.mastery.mean < a.mastery.mean ? b : a), ranked.value[0]))
const spread = computed(() => (highest.value && lowest.value ? highest.value.mastery.mean - lowest.value.mastery.mean : null))

const overviewRows = computed(() =>
  analysis.value.sections.map((s) => {
    const rates = V.attainmentRates(s.masteryPcts, settings.value)
    return {
      name: s.name,
      studentCount: s.studentCount,
      mean: s.mastery.mean,
      median: s.mastery.median,
      min: s.mastery.min,
      max: s.mastery.max,
      stdDev: s.mastery.stdDev,
      meanVsCohortPp: s.meanVsCohortPp,
      cohensD: s.cohensD,
      passRatePct: rates.pass.ratePct,
      distinctionRatePct: rates.distinction.ratePct,
    }
  })
)
const overviewColumns = [
  { key: 'name', label: 'Section', type: 'text' },
  { key: 'studentCount', label: 'Students', type: 'number' },
  { key: 'size', label: 'Size', type: 'text', verdict: (r) => V.sectionSizeVerdict(r.studentCount, settings.value) },
  { key: 'mean', label: 'Mean mastery', type: 'number', format: (v) => pct(v) },
  { key: 'level', label: 'Level', type: 'text', verdict: (r) => V.masteryVerdict(r.mean, settings.value) },
  { key: 'median', label: 'Median', type: 'number', format: (v) => pct(v) },
  { key: 'min', label: 'Min', type: 'number', format: (v) => pct(v) },
  { key: 'max', label: 'Max', type: 'number', format: (v) => pct(v) },
  { key: 'stdDev', label: 'Std dev (pp)', type: 'number', format: (v) => num(v) },
  { key: 'meanVsCohortPp', label: 'Difference from cohort', type: 'number', format: (v) => signed(v, ' pp') },
  { key: 'cohensD', label: 'Effect size (d)', type: 'number', format: (v) => num(v, 2) },
  { key: 'passRatePct', label: 'At or above pass mark', type: 'number', format: (v) => pct(v) },
  { key: 'distinctionRatePct', label: 'At or above distinction mark', type: 'number', format: (v) => pct(v) },
]

const radarSeries = computed(() => [
  ...analysis.value.sections.map((s) => ({ label: `${s.name} (${s.studentCount})`, values: s.dimensions, color: colorOf(s.name) })),
  { label: 'Cohort', values: analysis.value.cohort.dimensions, color: '#64748b', dashed: true },
])

const decileLabels = Array.from({ length: 10 }, (_, i) => `${i * 10}-${(i + 1) * 10}%`)
const distributionSeries = computed(() => analysis.value.sections.map((s) => ({ label: s.name, data: s.distribution, color: colorOf(s.name) })))

// One row per dimension (or tier) with a column per section.
function matrixRows(group, key, tests = null) {
  return profiles.value[group].map((name) => {
    const means = analysis.value.sections.map((s) => s[key][name]).filter((v) => v != null)
    const test = tests?.find((t) => t.dimension === name)
    return {
      name,
      ...Object.fromEntries(analysis.value.sections.map((s) => [`sec-${s.name}`, s[key][name]])),
      cohort: key === 'dimensions' ? analysis.value.cohort.dimensions[name] : null,
      spreadPp: means.length ? Math.round((Math.max(...means) - Math.min(...means)) * 100) / 100 : null,
      p: test?.p ?? null,
    }
  })
}
const matrixColumns = (label, withTest) => [
  { key: 'name', label, type: 'text' },
  ...analysis.value.sections.map((s) => ({
    key: `sec-${s.name}`,
    label: `Section ${s.name}`,
    type: 'number',
    format: (v) => pct(v),
    dot: (r) => V.masteryVerdict(r[`sec-${s.name}`], settings.value),
  })),
  { key: 'spreadPp', label: 'Spread (pp)', type: 'number', format: (v) => num(v) },
  ...(withTest
    ? [
        { key: 'p', label: 'p-value', type: 'number', format: (v) => (v == null ? '—' : String(v)) },
        { key: 'difference', label: 'Sections differ?', type: 'text', verdict: (r) => V.differenceVerdict(r.p, settings.value) },
      ]
    : []),
]

const dimensionRows = computed(() => matrixRows('dimensions', 'dimensions', analysis.value.dimensionTests))
const dimensionColumns = computed(() => matrixColumns('Dimension', true))
const tierRows = computed(() => matrixRows('difficulties', 'difficulties'))
const tierColumns = computed(() => matrixColumns('Tier', false))

const studentColumns = [
  { key: 'id', label: 'ID', type: 'text' },
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'section', label: 'Section', type: 'text', format: (v) => v ?? 'Unassigned' },
  { key: 'masteryPct', label: 'Mastery', type: 'number', format: (v) => pct(v) },
  { key: 'level', label: 'Level', type: 'text', verdict: (r) => V.masteryVerdict(r.masteryPct, settings.value) },
  { key: 'rank', label: 'Rank', type: 'number' },
]
</script>
