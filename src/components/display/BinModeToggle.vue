<template>
  <ToggleGroup type="single" variant="outline" size="sm" :model-value="modelValue" @update:model-value="(v) => v && $emit('update:modelValue', v)">
    <ToggleGroupItem value="percentage">Percentage bins</ToggleGroupItem>
    <ToggleGroupItem value="raw">Marks bins</ToggleGroupItem>
  </ToggleGroup>
</template>

<script setup>
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

// v-model: 'percentage' | 'raw'. One option is always selected.
defineProps({ modelValue: { type: String, required: true } })
defineEmits(['update:modelValue'])
</script>
