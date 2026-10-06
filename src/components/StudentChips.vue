<template>
  <details v-if="students.length" class="chips">
    <summary>{{ students.length }} student{{ students.length === 1 ? '' : 's' }}</summary>
    <div class="chip-list">
      <button v-for="s in students" :key="s.id" type="button" class="chip" @click="$emit('select', s.id)">{{ s.label }}</button>
    </div>
  </details>
  <span v-else class="muted">—</span>
</template>

<script setup>
// students: [{ id, label }]
defineProps({ students: { type: Array, required: true } })
defineEmits(['select'])
</script>
