<template>
  <span class="flex flex-wrap gap-1">
    <Badge v-for="r in reasons" :key="r.id" variant="outline" :class="TONE_BADGE[settings.showVerdicts ? r.tone : 'neutral']">{{ r.label }}</Badge>
  </span>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { Badge } from '@/components/ui/badge'
import { TONE_BADGE } from '@/lib/tones.js'
import { useSettingsStore } from '@/stores/settings.js'

// reasons: [{ id, label, tone }]. Unlike VerdictTag these are list entries, so
// they stay visible (in neutral grey) when verdict tags are switched off.
defineProps({ reasons: { type: Array, required: true } })
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
</script>
