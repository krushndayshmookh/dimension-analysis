<template>
  <span v-if="visible" class="tag" :class="`tag-${verdict.tone}`">
    <span class="tag-icon" aria-hidden="true">{{ ICONS[verdict.tone] }}</span>{{ verdict.label }}<span
      v-if="arrow"
      class="tag-arrow"
      :title="arrow.title"
    >{{ arrow.symbol }}</span>
  </span>
</template>

<script setup>
import { computed, inject } from 'vue'

// verdict: { label, tone, direction? } from lib/verdicts.js, or null. Renders
// nothing for no verdict, or when the instructor has turned verdicts off.
const props = defineProps({ verdict: { type: Object, default: null } })
const settings = inject('settings', null)

const ICONS = { good: '✓', warn: '!', bad: '✕', info: 'i', neutral: '•' }
const DIRECTIONS = {
  easier: { symbol: '▲', title: 'Actual is above expected (easier than expected)' },
  harder: { symbol: '▼', title: 'Actual is below expected (harder than expected)' },
  above: { symbol: '▲', title: 'Actual is above expected' },
  below: { symbol: '▼', title: 'Actual is below expected' },
}

const visible = computed(() => Boolean(props.verdict) && (settings?.value?.showVerdicts ?? true))
const arrow = computed(() => DIRECTIONS[props.verdict?.direction] ?? null)
</script>
