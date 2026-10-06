<template>
  <Card>
    <CardHeader v-if="title || $slots.actions || help">
      <CardTitle v-if="title">{{ title }}</CardTitle>
      <CardDescription v-if="description || $slots.description">
        <slot name="description">{{ description }}</slot>
      </CardDescription>
      <CardAction v-if="$slots.actions || help" class="no-print flex flex-wrap items-center gap-2">
        <slot name="actions" />
        <LearnMore v-if="help" :topic="help" />
      </CardAction>
    </CardHeader>
    <CardContent class="flex flex-col gap-4">
      <slot />
    </CardContent>
  </Card>
</template>

<script setup>
import LearnMore from '@/components/common/LearnMore.vue'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// help: a topic of lib/help.js, shown as a Learn more button at the top right.
defineProps({ title: { type: String, default: '' }, description: { type: String, default: '' }, help: { type: String, default: '' } })
</script>
