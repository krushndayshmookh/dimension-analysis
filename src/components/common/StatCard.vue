<template>
  <Card size="sm" class="gap-1">
    <CardContent class="flex flex-col gap-0.5">
      <span class="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">{{ label }}</span>
      <span class="text-2xl font-semibold leading-tight tabular-nums"><slot>{{ value }}</slot></span>
      <span v-if="$slots.description || description" class="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <slot name="description">{{ description }}</slot>
      </span>
    </CardContent>
  </Card>
</template>

<script setup>
import { Card, CardContent } from '@/components/ui/card'

defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '' },
  description: { type: String, default: '' },
})
</script>
