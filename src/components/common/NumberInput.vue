<template>
  <Input
    type="number"
    :model-value="display"
    :min="min"
    :max="max"
    :step="step"
    :placeholder="placeholder"
    :aria-label="ariaLabel"
    @update:model-value="onInput"
  />
</template>

<script setup>
import { computed } from 'vue'
import { Input } from '@/components/ui/input'

// A numeric input whose v-model is a number. An emptied field is NaN, or null
// when `nullable` (an optional value), so validation can report it.
const props = defineProps({
  modelValue: { type: Number, default: null },
  min: { type: Number, default: undefined },
  max: { type: Number, default: undefined },
  step: { type: Number, default: undefined },
  placeholder: { type: String, default: undefined },
  ariaLabel: { type: String, default: undefined },
  nullable: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const display = computed(() => (props.modelValue == null || Number.isNaN(props.modelValue) ? '' : props.modelValue))
const onInput = (raw) => emit('update:modelValue', raw === '' || raw == null ? (props.nullable ? null : NaN) : Number(raw))
</script>
