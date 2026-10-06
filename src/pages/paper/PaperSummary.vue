<template>
  <SectionCard title="Summary">
    <template #actions><LearnMore topic="summary" /></template>
    <StatGrid>
      <StatCard label="Lowest mean mastery, by dimension" :value="paper.summary.lowestDimension?.name ?? '—'">
        <template #description>{{ pct(paper.summary.lowestDimension?.meanPct) }} <VerdictTag :verdict="V.masteryVerdict(paper.summary.lowestDimension?.meanPct, settings)" /></template>
      </StatCard>
      <StatCard label="Highest mean mastery, by dimension" :value="paper.summary.highestDimension?.name ?? '—'">
        <template #description>{{ pct(paper.summary.highestDimension?.meanPct) }} <VerdictTag :verdict="V.masteryVerdict(paper.summary.highestDimension?.meanPct, settings)" /></template>
      </StatCard>
      <StatCard label="Spread between those dimensions" :value="`${num(paper.summary.dimensionSpreadPp)} pp`">
        <template #description><VerdictTag :verdict="V.spreadVerdict(paper.summary.dimensionSpreadPp, settings)" /></template>
      </StatCard>
      <StatCard label="Lowest mean mastery, by difficulty tier">
        <span class="capitalize">{{ paper.summary.lowestDifficulty?.name ?? '—' }}</span>
        <template #description>
          {{ pct(paper.summary.lowestDifficulty?.meanPct) }} · {{ num(paper.summary.lowestDifficulty?.availableMarks) }} marks ·
          {{ paper.summary.lowestDifficulty?.questionCount ?? 0 }} questions
          <VerdictTag :verdict="V.masteryVerdict(paper.summary.lowestDifficulty?.meanPct, settings)" />
        </template>
      </StatCard>
      <StatCard label="Paper difficulty (cohort mean)" :value="pct(paper.overall.pct.mean)">
        <template #description><VerdictTag :verdict="V.difficultyVerdict(paper.overall.pct.mean, settings)" /></template>
      </StatCard>
      <StatCard label="Reliability (Cronbach's alpha)" :value="num(paper.reliability.alpha, 2)">
        <template #description>
          standard error of measurement {{ num(paper.reliability.sem, 2) }} marks
          <VerdictTag :verdict="V.reliabilityVerdict(paper.reliability.alpha, settings)" />
        </template>
      </StatCard>
    </StatGrid>
  </SectionCard>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import VerdictTag from '@/components/display/VerdictTag.vue'
import LearnMore from '@/components/common/LearnMore.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import StatCard from '@/components/common/StatCard.vue'
import StatGrid from '@/components/common/StatGrid.vue'
import { formatNumber as num, formatPct as pct } from '@/lib/format.js'
import * as V from '@/lib/verdicts.js'
import { useSessionStore } from '@/stores/session.js'
import { useSettingsStore } from '@/stores/settings.js'

const sessionStore = useSessionStore()
const { paper } = storeToRefs(sessionStore)
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
</script>
