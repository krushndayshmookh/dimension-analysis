<template>
  <Select :model-value="modelValue" :disabled="disabled" @update:model-value="$emit('update:modelValue', $event)">
    <SelectTrigger :id="id" :aria-label="ariaLabel" :class="triggerClass">
      <SelectValue :placeholder="placeholder" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</SelectItem>
    </SelectContent>
  </Select>
</template>

<script setup>
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// options: [{ value: string, label }]. Values must be non-empty strings.
defineProps({
  modelValue: { type: String, default: undefined },
  options: { type: Array, required: true },
  placeholder: { type: String, default: 'Select…' },
  id: { type: String, default: undefined },
  ariaLabel: { type: String, default: undefined },
  disabled: { type: Boolean, default: false },
  triggerClass: { type: String, default: 'w-full' },
})
defineEmits(['update:modelValue'])
</script>
