<template>
  <div class="flex flex-col items-start gap-2">
    <div v-for="(b, i) in modelValue" :key="i" class="flex items-center gap-2">
      <Input :model-value="b.label" class="w-32" aria-label="Band label" @update:model-value="(v) => update(i, 'label', v)" />
      <span class="text-sm text-muted-foreground">from</span>
      <NumberInput :model-value="b.from" :min="0" :max="100" :step="1" class="w-20" aria-label="Band lower limit" @update:model-value="(v) => update(i, 'from', v)" />
      <span class="text-sm text-muted-foreground">%</span>
      <Button variant="outline" size="icon-sm" :disabled="modelValue.length <= 2" :aria-label="`Remove band ${b.label}`" @click="remove(i)"><Trash2Icon /></Button>
    </div>
    <Button variant="outline" size="sm" @click="add"><PlusIcon /> Add band</Button>
  </div>
</template>

<script setup>
import { PlusIcon, Trash2Icon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import NumberInput from '@/components/common/NumberInput.vue'
import { cloneSettings } from '@/lib/settings.js'

// v-model: [{ label, from }]. Validation (unique labels, lowest band at 0) is
// done by the settings validator.
const props = defineProps({ modelValue: { type: Array, required: true } })
const emit = defineEmits(['update:modelValue'])

const update = (index, key, value) => {
  const bands = cloneSettings(props.modelValue)
  bands[index][key] = value
  emit('update:modelValue', bands)
}
const remove = (index) => emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
const add = () => {
  const used = new Set(props.modelValue.map((b) => b.from))
  const from = [...Array(99).keys()].map((i) => i + 1).find((v) => !used.has(v)) ?? 1
  emit('update:modelValue', [...props.modelValue, { label: `Band ${props.modelValue.length + 1}`, from }])
}
</script>
