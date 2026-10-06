<template>
  <input
    type="file"
    :accept="accept"
    :multiple="multiple"
    :aria-label="ariaLabel"
    class="h-8 w-full min-w-0 cursor-pointer rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors file:mr-2 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    @change="$emit('change', multiple ? Array.from($event.target.files) : ($event.target.files[0] ?? null), $event)"
  />
</template>

<script setup>
// A plain file input styled like the other inputs. Emits the chosen File (or null),
// or an array of Files with `multiple`.
defineProps({ accept: { type: String, default: '.csv' }, multiple: { type: Boolean, default: false }, ariaLabel: { type: String, default: undefined } })
defineEmits(['change'])
</script>
