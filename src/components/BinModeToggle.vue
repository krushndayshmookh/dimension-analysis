<template>
  <div class="radio-group">
    <label v-for="[value, text] in OPTIONS" :key="value">
      <input type="radio" :name="name" :value="value" :checked="modelValue === value" @change="$emit('update:modelValue', value)" />
      {{ text }}
    </label>
  </div>
</template>

<script setup>
defineProps({ modelValue: { type: String, required: true }, name: { type: String, required: true } })
defineEmits(['update:modelValue'])

const OPTIONS = [['percentage', 'Percentage bins'], ['raw', 'Marks bins']]
</script>
