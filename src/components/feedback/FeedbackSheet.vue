<template>
  <article class="feedback-sheet mx-auto max-w-[190mm] bg-white p-[12mm] text-xs leading-snug text-gray-900 ring-1 ring-gray-200 print:break-after-page print:p-[8mm] print:ring-0">
    <header class="flex items-start justify-between gap-3 border-b-2 border-gray-900 pb-2">
      <div>
        <h1 class="text-xl font-bold">Exam feedback</h1>
        <p class="text-gray-600">{{ sheet.header.courseName }} · {{ sheet.header.examTitle }} · {{ sheet.header.examDate }}</p>
      </div>
      <div class="flex flex-col text-right text-[13px]">
        <strong>{{ sheet.header.studentName }}</strong>
        <span class="text-gray-600">{{ sheet.header.studentId }}<template v-if="sheet.header.section"> · Section {{ sheet.header.section }}</template></span>
      </div>
    </header>

    <div class="my-3 flex flex-wrap gap-2.5">
      <SheetFigure label="Marks" :value="`${num(sheet.overall.earned)} / ${num(sheet.overall.totalMarks)}`" />
      <SheetFigure label="Mastery" :value="pct(sheet.overall.masteryPct)" />
      <SheetFigure label="On attempted questions" :value="pct(sheet.overall.accuracyPct)" />
      <SheetFigure v-if="'cohortMasteryPct' in sheet.overall" label="Cohort average" :value="pct(sheet.overall.cohortMasteryPct)" />
      <SheetFigure v-if="'rank' in sheet.overall" label="Rank" :value="`${sheet.overall.rank} of ${sheet.overall.studentCount}`" />
      <SheetFigure v-if="'percentile' in sheet.overall" label="Percentile" :value="num(sheet.overall.percentile)" />
    </div>

    <div class="grid grid-cols-[270px_1fr] items-start gap-3.5">
      <div>
        <RadarSvg :values="sheet.radar.values" :reference="sheet.radar.reference ?? null" class="size-[270px]" />
        <p class="text-center text-[11px] text-gray-600">
          <span class="mx-1 inline-block w-4 border-t-[3px] border-blue-600 align-middle"></span>You
          <template v-if="sheet.radar.reference">
            <span class="mx-1 ml-3 inline-block w-4 border-t-2 border-dashed border-slate-500 align-middle"></span>Cohort average
          </template>
        </p>
      </div>
      <div>
        <h2 class="sheet-heading">By dimension</h2>
        <table class="sheet-table">
          <thead>
            <tr>
              <th>Dimension</th><th class="num">Marks</th><th class="num">Mastery</th>
              <template v-if="hasCohort"><th class="num">Cohort</th><th class="num">Difference</th></template>
              <th v-if="showLevels"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in sheet.dimensions" :key="d.dimension">
              <td><DimensionBadge :dimension="d.dimension" /></td>
              <td class="num">{{ num(d.earned) }} / {{ num(d.availableExam) }}</td>
              <td class="num font-bold">{{ pct(d.masteryPct) }}</td>
              <template v-if="hasCohort">
                <td class="num">{{ pct(d.cohortMasteryPct) }}</td>
                <td class="num">{{ signed(d.differencePp, ' pp') }}</td>
              </template>
              <td v-if="showLevels"><VerdictTag :verdict="V.masteryVerdict(d.masteryPct, settings)" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="sheet.lowestTopics.length">
      <h2 class="sheet-heading">Topics with the lowest marks</h2>
      <ul class="list-disc pl-[18px]">
        <li v-for="t in sheet.lowestTopics" :key="t.topic">
          <strong>{{ t.topic }}</strong> — {{ pct(t.masteryPct) }} ({{ num(t.earned) }} of {{ num(t.available) }} marks)
        </li>
      </ul>
    </div>

    <div v-if="sheet.questions">
      <h2 class="sheet-heading">Marks per question</h2>
      <table class="sheet-table">
        <thead><tr><th>Question</th><th>Topics</th><th>Dimensions</th><th class="num">Marks</th></tr></thead>
        <tbody>
          <tr v-for="q in sheet.questions" :key="q.id">
            <td>{{ q.id }}</td>
            <td>{{ q.topics.join(', ') }}</td>
            <td>{{ q.dimensions.join(', ') }}</td>
            <td class="num">{{ q.attempted ? num(q.earned) : '—' }} / {{ num(q.marks) }}</td>
          </tr>
        </tbody>
      </table>
      <p class="mt-1 text-[10px] text-gray-500">— means the question was left blank.</p>
    </div>

    <div v-if="sheet.comment">
      <h2 class="sheet-heading">Comments</h2>
      <p class="whitespace-pre-wrap">{{ sheet.comment }}</p>
    </div>
  </article>
</template>

<script setup>
import { computed, defineComponent, h } from 'vue'
import { storeToRefs } from 'pinia'
import RadarSvg from '@/components/charts/RadarSvg.vue'
import VerdictTag from '@/components/display/VerdictTag.vue'
import DimensionBadge from '@/components/common/DimensionBadge.vue'
import * as V from '@/lib/verdicts.js'
import { formatNumber as num, formatPct as pct, formatSigned as signed } from '@/lib/format.js'
import { useSettingsStore } from '@/stores/settings.js'

// sheet: buildFeedback() result. `levels` adds Weak/Average/Strong tags (when
// verdict tags are enabled in Settings).
const props = defineProps({ sheet: { type: Object, required: true }, levels: { type: Boolean, default: false } })
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const SheetFigure = defineComponent({
  props: { label: String, value: String },
  setup: (p) => () =>
    h('div', { class: 'min-w-24 rounded-md border border-gray-300 px-3 py-1.5' }, [
      h('span', { class: 'block text-[10px] uppercase text-gray-500' }, p.label),
      h('span', { class: 'text-[17px] font-bold' }, p.value),
    ]),
})

const hasCohort = computed(() => props.sheet.dimensions.length > 0 && 'cohortMasteryPct' in props.sheet.dimensions[0])
const showLevels = computed(() => props.levels && settings.value.showVerdicts)
</script>

<style scoped>
.sheet-heading { margin: 0.9rem 0 0.4rem; font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #374151; }
.sheet-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
.sheet-table th, .sheet-table td { border-bottom: 1px solid #e5e7eb; padding: 4px 6px; text-align: left; }
.sheet-table th { background: #f3f4f6; }
.sheet-table .num { text-align: right; }
</style>
