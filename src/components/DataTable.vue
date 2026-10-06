<template>
  <div class="data-table">
    <div v-if="searchable || exportName" class="dt-toolbar">
      <input
        v-if="searchable"
        v-model="search"
        type="search"
        class="dt-search"
        :placeholder="searchPlaceholder"
        aria-label="Search table"
      />
      <button v-if="hasActiveFilters" type="button" class="btn-sm btn-secondary" @click="clearAll">
        Clear filters
      </button>
      <button v-if="exportName" type="button" class="btn-sm btn-secondary" @click="exportCsv">
        Export CSV
      </button>
      <span class="dt-count">{{ visibleRows.length }} of {{ rows.length }} rows</span>
    </div>

    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th
              v-for="column in shownColumns"
              :key="column.key"
              :class="cellClass(column)"
              :aria-sort="ariaSort(column)"
            >
              <button
                v-if="column.sortable !== false"
                type="button"
                class="dt-sort"
                :title="`Sort by ${column.label}`"
                @click="toggleSort(column)"
              >
                {{ column.label }}
                <span class="sort-icon">{{ sortIcon(column) }}</span>
              </button>
              <span v-else>{{ column.label }}</span>
            </th>
          </tr>
          <tr class="dt-filters">
            <th v-for="column in shownColumns" :key="column.key">
              <input
                v-if="column.filterable !== false"
                v-model="filters[column.key]"
                type="text"
                :placeholder="column.type === 'number' ? '>50  40..60' : 'filter'"
                :aria-label="`Filter ${column.label}`"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in visibleRows"
            :key="rowKey ? row[rowKey] : index"
            :class="{ clickable }"
            @click="clickable && $emit('row-click', row)"
          >
            <td v-for="column in shownColumns" :key="column.key" :class="cellClass(column)">
              <slot
                :name="`cell-${column.key}`"
                :row="row"
                :value="columnValue(column, row)"
                :text="columnText(column, row)"
              >
                <template v-if="column.verdict">
                  <VerdictTag v-for="(v, i) in verdictList(column, row)" :key="i" :verdict="v" />
                  <span v-if="!verdictList(column, row).length" class="muted">—</span>
                </template>
                <template v-else>
                  <span
                    v-if="column.dot && showVerdicts && column.dot(row)"
                    class="dot"
                    :class="`dot-${column.dot(row).tone}`"
                    :title="column.dot(row).label"
                  ></span>{{ columnText(column, row) || '—' }}
                </template>
              </slot>
            </td>
          </tr>
          <tr v-if="!visibleRows.length">
            <td :colspan="shownColumns.length" class="dt-empty">
              {{ rows.length ? 'No rows match the current search and filters.' : emptyText }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, reactive, ref } from 'vue'
import VerdictTag from './VerdictTag.vue'
import { applyTableState, columnText, columnValue, tableToCsv, verdictList } from '../lib/table.js'

const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  rowKey: { type: String, default: null },
  defaultSort: { type: Object, default: null },
  clickable: { type: Boolean, default: false },
  searchable: { type: Boolean, default: true },
  searchPlaceholder: { type: String, default: 'Search all columns…' },
  emptyText: { type: String, default: 'No data.' },
  // File name (without .csv) for the Export CSV button; omit to hide the button.
  exportName: { type: String, default: null },
})

defineEmits(['row-click'])

const settings = inject('settings', null)
const showVerdicts = computed(() => settings?.value?.showVerdicts ?? true)

// Verdict columns disappear when the instructor turns verdict tags off.
const shownColumns = computed(() => props.columns.filter((c) => !c.verdict || showVerdicts.value))

const search = ref('')
const filters = reactive({})
const sortKey = ref(props.defaultSort?.key ?? null)
const sortDir = ref(props.defaultSort?.dir ?? 'asc')

const visibleRows = computed(() =>
  applyTableState(props.rows, shownColumns.value, {
    search: search.value,
    filters,
    sortKey: sortKey.value,
    sortDir: sortDir.value,
  })
)

const hasActiveFilters = computed(
  () => search.value.trim() !== '' || Object.values(filters).some((f) => String(f ?? '').trim() !== '')
)

// Exports the rows as currently searched, filtered and sorted.
function exportCsv() {
  const blob = new Blob([tableToCsv(visibleRows.value, shownColumns.value)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${props.exportName}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function clearAll() {
  search.value = ''
  for (const key of Object.keys(filters)) filters[key] = ''
}

// asc -> desc -> back to the original order
function toggleSort(column) {
  if (sortKey.value !== column.key) {
    sortKey.value = column.key
    sortDir.value = 'asc'
  } else if (sortDir.value === 'asc') {
    sortDir.value = 'desc'
  } else {
    sortKey.value = null
    sortDir.value = 'asc'
  }
}

const sortIcon = (column) => (sortKey.value !== column.key ? '↕' : sortDir.value === 'asc' ? '▲' : '▼')
const ariaSort = (column) =>
  sortKey.value !== column.key ? 'none' : sortDir.value === 'asc' ? 'ascending' : 'descending'
const cellClass = (column) => (column.type === 'number' || column.align === 'right' ? 'num-cell' : '')
</script>
