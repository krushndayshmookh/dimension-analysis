<template>
  <Badge v-if="visible" variant="outline" :class="TONE_BADGE[verdict.tone] ?? TONE_BADGE.neutral">
    <component :is="ICONS[verdict.tone] ?? MinusIcon" aria-hidden="true" />
    {{ verdict.label }}
    <component :is="arrow.icon" v-if="arrow" :title="arrow.title" class="opacity-80" />
  </Badge>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, InfoIcon, MinusIcon, PlusIcon, TriangleAlertIcon, XIcon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { TONE_BADGE } from '@/lib/tones.js'
import { useSettingsStore } from '@/stores/settings.js'

// verdict: { label, tone, direction? } from lib/verdicts.js, or null. Renders
// nothing for no verdict, or when the instructor has turned verdicts off. The
// icon makes the tone readable without color.
const props = defineProps({ verdict: { type: Object, default: null } })
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const ICONS = { good: CheckIcon, warn: TriangleAlertIcon, bad: XIcon, info: InfoIcon, neutral: MinusIcon }
const DIRECTIONS = {
  easier: { icon: ArrowUpIcon, title: 'Actual is above expected (easier than expected)' },
  harder: { icon: ArrowDownIcon, title: 'Actual is below expected (harder than expected)' },
  above: { icon: ArrowUpIcon, title: 'Actual is above expected' },
  below: { icon: ArrowDownIcon, title: 'Actual is below expected' },
  positive: { icon: PlusIcon, title: 'Positive: both rise together' },
  negative: { icon: MinusIcon, title: 'Negative: one rises as the other falls' },
}

const visible = computed(() => Boolean(props.verdict) && settings.value.showVerdicts)
const arrow = computed(() => DIRECTIONS[props.verdict?.direction] ?? null)
</script>
