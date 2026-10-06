<template>
  <div class="pair-bar" :title="`${firstLabel}: ${formatPct(first)} · ${secondLabel}: ${formatPct(second)}`">
    <div class="bar"><div class="bar-fill first" :style="{ width: `${clampPct(first)}%` }"></div></div>
    <div class="bar">
      <div
        class="bar-fill"
        :class="color ? 'tinted' : 'second'"
        :style="{ width: `${clampPct(second)}%`, ...(color ? { '--bar-color': color } : {}) }"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { clampPct, formatPct } from '../lib/format.js'

defineProps({
  first: { type: Number, default: null },
  second: { type: Number, default: null },
  firstLabel: { type: String, default: '' },
  secondLabel: { type: String, default: '' },
  color: { type: String, default: null },
})
</script>
