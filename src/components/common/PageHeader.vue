<template>
  <header class="flex flex-wrap items-start justify-between gap-3">
    <div class="space-y-1">
      <h2 class="text-2xl font-semibold tracking-tight">{{ title }}</h2>
      <p v-if="description || $slots.description" class="max-w-3xl text-sm text-muted-foreground">
        <slot name="description">{{ description }}</slot>
      </p>
    </div>
    <div v-if="$slots.actions || help" class="no-print flex flex-wrap items-center gap-2">
      <slot name="actions" />
      <LearnMore v-if="help" :topic="help" />
    </div>
  </header>
</template>

<script setup>
import LearnMore from '@/components/common/LearnMore.vue'

// help: a topic of lib/help.js, shown as a Learn more button.
defineProps({ title: { type: String, required: true }, description: { type: String, default: '' }, help: { type: String, default: '' } })
</script>
