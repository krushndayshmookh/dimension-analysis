<template>
  <Badge :class="DIMENSION_BADGE[dimension] ?? ''" :variant="DIMENSION_BADGE[dimension] ? 'default' : 'secondary'">{{ dimension }}</Badge>
</template>

<script setup>
import { Badge } from '@/components/ui/badge'
import { DIMENSION_BADGE } from '@/lib/tones.js'

defineProps({ dimension: { type: String, required: true } })
</script>
