<template>
  <ToggleGroup type="single" variant="outline" size="sm" :model-value="modelValue" aria-label="Question type" @update:model-value="(v) => v && $emit('update:modelValue', v)">
    <ToggleGroupItem value="both">Both</ToggleGroupItem>
    <ToggleGroupItem value="assignment">Assignment</ToggleGroupItem>
    <ToggleGroupItem value="assessment">Assessment</ToggleGroupItem>
  </ToggleGroup>
</template>

<script setup>
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

// v-model: 'both' | 'assignment' | 'assessment'. One option is always selected.
defineProps({ modelValue: { type: String, required: true } })
defineEmits(['update:modelValue'])
</script>
