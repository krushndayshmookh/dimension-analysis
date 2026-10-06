<template>
  <div class="flex min-w-28 flex-col gap-1" :title="`${firstLabel}: ${formatPct(first)} · ${secondLabel}: ${formatPct(second)}`">
    <Progress :model-value="clampPct(first)" class="h-1.5 *:data-[slot=progress-indicator]:bg-muted-foreground/60" />
    <Progress
      :model-value="clampPct(second)"
      class="h-1.5 *:data-[slot=progress-indicator]:bg-(--bar-color)"
      :style="{ '--bar-color': color ?? 'var(--primary)' }"
    />
  </div>
</template>

<script setup>
import { Progress } from '@/components/ui/progress'
import { clampPct, formatPct } from '@/lib/format.js'

// Two stacked bars: the first (grey) and the second (primary or the given color).
defineProps({
  first: { type: Number, default: null },
  second: { type: Number, default: null },
  firstLabel: { type: String, default: '' },
  secondLabel: { type: String, default: '' },
  color: { type: String, default: null },
})
</script>
