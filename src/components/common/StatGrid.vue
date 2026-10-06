<template>
  <div class="grid gap-3" :style="{ gridTemplateColumns: `repeat(auto-fit, minmax(${compact ? '9.5rem' : '13rem'}, 1fr))` }">
    <slot />
  </div>
</template>

<script setup>
defineProps({ compact: { type: Boolean, default: false } })
</script>
