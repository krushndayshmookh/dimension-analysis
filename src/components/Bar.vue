<template>
  <div class="bar">
    <div class="bar-fill" :class="{ tinted: color }" :style="style"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { clampPct } from '../lib/format.js'

const props = defineProps({ value: { type: Number, default: null }, color: { type: String, default: null } })
const style = computed(() => ({ width: `${clampPct(props.value)}%`, ...(props.color ? { '--bar-color': props.color } : {}) }))
</script>
