<template>
  <aside class="no-print flex flex-col gap-2 rounded-xl bg-card p-3 text-card-foreground ring-1 ring-foreground/10 lg:sticky lg:top-2 lg:max-h-[calc(100vh-1rem)]" aria-label="Students">
    <Input v-model="query" type="search" placeholder="Search students…" aria-label="Search students" />
    <SelectField
      v-if="options.sections.length"
      v-model="section"
      :options="sectionChoices"
      aria-label="Filter by section"
    />
    <div v-if="multiple" class="flex flex-wrap items-center gap-1.5">
      <Button variant="outline" size="xs" @click="selectShown">Select shown</Button>
      <Button variant="outline" size="xs" @click="$emit('update:modelValue', [])">Clear</Button>
      <span class="text-xs text-muted-foreground">{{ modelValue.length }} selected</span>
    </div>
    <ScrollArea class="min-h-0 flex-1">
      <ul class="flex max-h-[28rem] flex-col gap-0.5 pr-2 lg:max-h-[calc(100vh-14rem)]">
        <li v-for="item in shown" :key="item.id">
          <label
            v-if="multiple"
            class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
            :class="modelValue.includes(item.id) ? 'bg-muted' : ''"
          >
            <Checkbox :model-value="modelValue.includes(item.id)" @update:model-value="toggle(item.id)" />
            <StudentRow :item="item" :show-dot="showVerdicts" />
          </label>
          <button
            v-else
            type="button"
            class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
            :class="item.id === modelValue ? 'bg-muted ring-1 ring-primary/40' : ''"
            @click="$emit('update:modelValue', item.id)"
          >
            <StudentRow :item="item" :show-dot="showVerdicts" />
          </button>
        </li>
        <li v-if="!shown.length" class="px-2 py-3 text-sm text-muted-foreground">No students match.</li>
      </ul>
    </ScrollArea>
  </aside>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { computed, defineComponent, h, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import SelectField from '@/components/common/SelectField.vue'
import { NO_SECTION, filterStudentItems, sectionOptions } from '@/lib/students.js'
import { TONE_DOT } from '@/lib/tones.js'
import { useSettingsStore } from '@/stores/settings.js'

// items: [{ id, name, section?, detail?, tone? }]. Single selection by default
// (v-model is an id); with `multiple`, v-model is a list of ids.
const props = defineProps({
  items: { type: Array, required: true },
  modelValue: { type: [String, Array], default: '' },
  multiple: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const StudentRow = defineComponent({
  props: { item: Object, showDot: Boolean },
  setup: (p) => () =>
    h('span', { class: 'flex min-w-0 flex-1 items-center justify-between gap-2' }, [
      h('span', { class: 'flex min-w-0 flex-col' }, [
        h('span', { class: 'truncate text-sm font-medium' }, p.item.name),
        h('span', { class: 'truncate text-xs text-muted-foreground' }, `${p.item.id}${p.item.section ? ` · ${p.item.section}` : ''}`),
      ]),
      p.item.detail
        ? h('span', { class: 'flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground' }, [
            p.item.tone && p.showDot ? h('span', { class: `size-2 rounded-full ${TONE_DOT[p.item.tone] ?? 'bg-border'}` }) : null,
            p.item.detail,
          ])
        : null,
    ]),
})

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
const showVerdicts = computed(() => settings.value.showVerdicts)

const ALL = '__all__'
const query = ref('')
const section = ref(ALL)
const options = computed(() => sectionOptions(props.items))
const sectionChoices = computed(() => [
  { value: ALL, label: 'All sections' },
  ...options.value.sections.map((s) => ({ value: s, label: `Section ${s}` })),
  ...(options.value.hasUnassigned ? [{ value: NO_SECTION, label: 'No section' }] : []),
])
const shown = computed(() => filterStudentItems(props.items, { query: query.value, section: section.value === ALL ? '' : section.value }))

const toggle = (id) =>
  emit('update:modelValue', props.modelValue.includes(id) ? props.modelValue.filter((x) => x !== id) : [...props.modelValue, id])
const selectShown = () => emit('update:modelValue', [...new Set([...props.modelValue, ...shown.value.map((i) => i.id)])])
</script>
