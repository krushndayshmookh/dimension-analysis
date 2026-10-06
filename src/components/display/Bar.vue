<template>
  <Progress
    :model-value="clampPct(value)"
    class="h-2 min-w-20 *:data-[slot=progress-indicator]:bg-(--bar-color)"
    :style="{ '--bar-color': color ?? 'var(--primary)' }"
  />
</template>

<script setup>
import { Progress } from '@/components/ui/progress'
import { clampPct } from '@/lib/format.js'

defineProps({ value: { type: Number, default: null }, color: { type: String, default: null } })
</script>
