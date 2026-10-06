<template>
  <div class="data-table">
    <div v-if="searchable" class="dt-toolbar">
      <input
        v-model="search"
        type="search"
        class="dt-search"
        :placeholder="searchPlaceholder"
        aria-label="Search table"
      />
      <button v-if="hasActiveFilters" type="button" class="btn-sm btn-secondary" @click="clearAll">
        Clear filters
      </button>
      <span class="dt-count">{{ visibleRows.length }} of {{ rows.length }} rows</span>
    </div>

    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th
              v-for="column in columns"
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
            <th v-for="column in columns" :key="column.key">
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
            <td v-for="column in columns" :key="column.key" :class="cellClass(column)">
              <slot
                :name="`cell-${column.key}`"
                :row="row"
                :value="columnValue(column, row)"
                :text="columnText(column, row)"
              >
                {{ columnText(column, row) || '—' }}
              </slot>
            </td>
          </tr>
          <tr v-if="!visibleRows.length">
            <td :colspan="columns.length" class="dt-empty">
              {{ rows.length ? 'No rows match the current search and filters.' : emptyText }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { applyTableState, columnText, columnValue } from '../lib/table.js'

const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  rowKey: { type: String, default: null },
  defaultSort: { type: Object, default: null },
  clickable: { type: Boolean, default: false },
  searchable: { type: Boolean, default: true },
  searchPlaceholder: { type: String, default: 'Search all columns…' },
  emptyText: { type: String, default: 'No data.' },
})

defineEmits(['row-click'])

const search = ref('')
const filters = reactive({})
const sortKey = ref(props.defaultSort?.key ?? null)
const sortDir = ref(props.defaultSort?.dir ?? 'asc')

const visibleRows = computed(() =>
  applyTableState(props.rows, props.columns, {
    search: search.value,
    filters,
    sortKey: sortKey.value,
    sortDir: sortDir.value,
  })
)

const hasActiveFilters = computed(
  () => search.value.trim() !== '' || Object.values(filters).some((f) => String(f ?? '').trim() !== '')
)

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
