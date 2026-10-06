<template>
  <Card>
    <CardHeader v-if="title || $slots.actions">
      <CardTitle v-if="title">{{ title }}</CardTitle>
      <CardDescription v-if="description || $slots.description">
        <slot name="description">{{ description }}</slot>
      </CardDescription>
      <CardAction v-if="$slots.actions" class="no-print flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </CardAction>
    </CardHeader>
    <CardContent class="flex flex-col gap-4">
      <slot />
    </CardContent>
  </Card>
</template>

<script setup>
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

defineProps({ title: { type: String, default: '' }, description: { type: String, default: '' } })
</script>
