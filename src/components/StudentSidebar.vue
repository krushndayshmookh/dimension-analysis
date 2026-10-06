<template>
  <aside class="student-sidebar" aria-label="Students">
    <input v-model="query" type="search" class="sidebar-search" placeholder="Search students…" aria-label="Search students" />
    <select v-if="options.sections.length" v-model="section" aria-label="Filter by section">
      <option value="">All sections</option>
      <option v-for="s in options.sections" :key="s" :value="s">Section {{ s }}</option>
      <option v-if="options.hasUnassigned" :value="NO_SECTION">No section</option>
    </select>
    <div v-if="multiple" class="sidebar-actions">
      <button type="button" class="btn-sm btn-secondary" @click="selectShown">Select shown</button>
      <button type="button" class="btn-sm btn-secondary" @click="$emit('update:modelValue', [])">Clear</button>
      <span class="hint">{{ modelValue.length }} selected</span>
    </div>
    <ul class="sidebar-list">
      <li v-for="item in shown" :key="item.id">
        <label v-if="multiple" class="sidebar-item" :class="{ active: modelValue.includes(item.id) }">
          <input type="checkbox" :checked="modelValue.includes(item.id)" @change="toggle(item.id)" />
          <span class="si-main">
            <span class="si-name">{{ item.name }}</span>
            <span class="si-meta">{{ item.id }}<template v-if="item.section"> · {{ item.section }}</template></span>
          </span>
          <span v-if="item.detail" class="si-detail"><span v-if="item.tone && showVerdicts" class="dot" :class="`dot-${item.tone}`"></span>{{ item.detail }}</span>
        </label>
        <button v-else type="button" class="sidebar-item" :class="{ active: item.id === modelValue }" @click="$emit('update:modelValue', item.id)">
          <span class="si-main">
            <span class="si-name">{{ item.name }}</span>
            <span class="si-meta">{{ item.id }}<template v-if="item.section"> · {{ item.section }}</template></span>
          </span>
          <span v-if="item.detail" class="si-detail"><span v-if="item.tone && showVerdicts" class="dot" :class="`dot-${item.tone}`"></span>{{ item.detail }}</span>
        </button>
      </li>
      <li v-if="!shown.length" class="muted sidebar-empty">No students match.</li>
    </ul>
  </aside>
</template>

<script setup>
import { computed, inject, ref } from 'vue'
import { NO_SECTION, filterStudentItems, sectionOptions } from '../lib/students.js'

// items: [{ id, name, section?, detail?, tone? }]. Single selection by default
// (v-model is an id); with `multiple`, v-model is a list of ids.
const props = defineProps({
  items: { type: Array, required: true },
  modelValue: { type: [String, Array], default: '' },
  multiple: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const settings = inject('settings', null)
const showVerdicts = computed(() => settings?.value?.showVerdicts ?? true)

const query = ref('')
const section = ref('')
const options = computed(() => sectionOptions(props.items))
const shown = computed(() => filterStudentItems(props.items, { query: query.value, section: section.value }))

const toggle = (id) =>
  emit('update:modelValue', props.modelValue.includes(id) ? props.modelValue.filter((x) => x !== id) : [...props.modelValue, id])
const selectShown = () => emit('update:modelValue', [...new Set([...props.modelValue, ...shown.value.map((i) => i.id)])])
</script>
