<template>
  <div class="grid gap-1.5">
    <Label :for="htmlFor">{{ label }}</Label>
    <slot />
    <p v-if="hint || $slots.hint" class="text-xs text-muted-foreground"><slot name="hint">{{ hint }}</slot></p>
  </div>
</template>

<script setup>
import { Label } from '@/components/ui/label'

defineProps({ label: { type: String, required: true }, htmlFor: { type: String, default: undefined }, hint: { type: String, default: '' } })
</script>
