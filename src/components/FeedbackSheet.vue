<template>
  <article class="feedback-sheet">
    <header class="fs-header">
      <div>
        <h1>Exam feedback</h1>
        <p>{{ sheet.header.courseName }} · {{ sheet.header.examTitle }} · {{ sheet.header.examDate }}</p>
      </div>
      <div class="fs-student">
        <strong>{{ sheet.header.studentName }}</strong>
        <span>{{ sheet.header.studentId }}<template v-if="sheet.header.section"> · Section {{ sheet.header.section }}</template></span>
      </div>
    </header>

    <div class="fs-summary">
      <div><span class="fs-label">Marks</span><span class="fs-value">{{ num(sheet.overall.earned) }} / {{ num(sheet.overall.totalMarks) }}</span></div>
      <div><span class="fs-label">Mastery</span><span class="fs-value">{{ pct(sheet.overall.masteryPct) }}</span></div>
      <div>
        <span class="fs-label">On attempted questions</span>
        <span class="fs-value">{{ pct(sheet.overall.accuracyPct) }}</span>
      </div>
      <div v-if="'cohortMasteryPct' in sheet.overall"><span class="fs-label">Cohort average</span><span class="fs-value">{{ pct(sheet.overall.cohortMasteryPct) }}</span></div>
      <div v-if="'rank' in sheet.overall"><span class="fs-label">Rank</span><span class="fs-value">{{ sheet.overall.rank }} of {{ sheet.overall.studentCount }}</span></div>
      <div v-if="'percentile' in sheet.overall"><span class="fs-label">Percentile</span><span class="fs-value">{{ num(sheet.overall.percentile) }}</span></div>
    </div>

    <div class="fs-columns">
      <div class="fs-radar">
        <RadarSvg :values="sheet.radar.values" :reference="sheet.radar.reference ?? null" />
        <p class="fs-legend">
          <span class="fs-key fs-key-own"></span> You
          <template v-if="sheet.radar.reference"><span class="fs-key fs-key-ref"></span> Cohort average</template>
        </p>
      </div>
      <div class="fs-dimensions">
        <h2>By dimension</h2>
        <table>
          <thead>
            <tr>
              <th>Dimension</th><th class="num">Marks</th><th class="num">Mastery</th>
              <template v-if="hasCohort"><th class="num">Cohort</th><th class="num">Difference</th></template>
              <th v-if="levels"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in sheet.dimensions" :key="d.dimension">
              <td><span class="badge" :class="dimensionClass(d.dimension)">{{ d.dimension }}</span></td>
              <td class="num">{{ num(d.earned) }} / {{ num(d.availableExam) }}</td>
              <td class="num"><strong>{{ pct(d.masteryPct) }}</strong></td>
              <template v-if="hasCohort">
                <td class="num">{{ pct(d.cohortMasteryPct) }}</td>
                <td class="num">{{ signed(d.differencePp, ' pp') }}</td>
              </template>
              <td v-if="levels"><VerdictTag :verdict="V.masteryVerdict(d.masteryPct, settings)" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="sheet.lowestTopics.length" class="fs-topics">
      <h2>Topics with the lowest marks</h2>
      <ul>
        <li v-for="t in sheet.lowestTopics" :key="t.topic">
          <strong>{{ t.topic }}</strong> — {{ pct(t.masteryPct) }} ({{ num(t.earned) }} of {{ num(t.available) }} marks)
        </li>
      </ul>
    </div>

    <div v-if="sheet.questions" class="fs-questions">
      <h2>Marks per question</h2>
      <table>
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
      <p class="fs-note">— means the question was left blank.</p>
    </div>

    <div v-if="sheet.comment" class="fs-comment">
      <h2>Comments</h2>
      <p>{{ sheet.comment }}</p>
    </div>
  </article>
</template>

<script setup>
import { computed, inject } from 'vue'
import RadarSvg from './charts/RadarSvg.vue'
import VerdictTag from './VerdictTag.vue'
import * as V from '../lib/verdicts.js'
import { dimensionClass } from '../lib/colors.js'
import { formatNumber as num, formatPct as pct, formatSigned as signed } from '../lib/format.js'

// sheet: buildFeedback() result. `levels` adds Weak/Average/Strong tags (when
// verdict tags are enabled in Settings).
const props = defineProps({ sheet: { type: Object, required: true }, levels: { type: Boolean, default: false } })
const settings = inject('settings')

const hasCohort = computed(() => props.sheet.dimensions.length > 0 && 'cohortMasteryPct' in props.sheet.dimensions[0])
const levels = computed(() => props.levels && settings.value.showVerdicts)
</script>
