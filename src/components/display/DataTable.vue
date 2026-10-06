<template>
  <div class="flex flex-col gap-2">
    <div v-if="searchable || exportName" class="no-print flex flex-wrap items-center gap-2">
      <Input v-if="searchable" v-model="search" type="search" class="max-w-xs" :placeholder="searchPlaceholder" aria-label="Search table" />
      <Button v-if="hasActiveFilters" variant="outline" size="sm" @click="clearAll">Clear filters</Button>
      <Button v-if="exportName" variant="outline" size="sm" @click="exportCsv"><DownloadIcon /> Export CSV</Button>
      <span class="ml-auto text-xs text-muted-foreground">{{ visibleRows.length }} of {{ rows.length }} rows</span>
    </div>

    <div class="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead v-for="column in shownColumns" :key="column.key" :class="cellClass(column)" :aria-sort="ariaSort(column)">
              <Button
                v-if="column.sortable !== false"
                variant="ghost"
                size="xs"
                class="-mx-1.5 h-6 font-semibold"
                :title="`Sort by ${column.label}`"
                @click="toggleSort(column)"
              >
                {{ column.label }}
                <component :is="sortIcon(column)" class="text-muted-foreground" />
              </Button>
              <span v-else>{{ column.label }}</span>
            </TableHead>
          </TableRow>
          <TableRow class="no-print bg-muted/30 hover:bg-muted/30">
            <TableHead v-for="column in shownColumns" :key="column.key" class="h-auto py-1">
              <Input
                v-if="column.filterable !== false"
                v-model="filters[column.key]"
                type="text"
                class="h-7 min-w-16 px-2 text-xs"
                :placeholder="column.type === 'number' ? '>50  40..60' : 'filter'"
                :aria-label="`Filter ${column.label}`"
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="(row, index) in visibleRows"
            :key="rowKey ? row[rowKey] : index"
            :class="clickable ? 'cursor-pointer' : ''"
            @click="clickable && $emit('row-click', row)"
          >
            <TableCell v-for="column in shownColumns" :key="column.key" :class="cellClass(column)">
              <slot :name="`cell-${column.key}`" :row="row" :value="columnValue(column, row)" :text="columnText(column, row)">
                <template v-if="column.verdict">
                  <span class="flex flex-wrap gap-1">
                    <VerdictTag v-for="(v, i) in verdictList(column, row)" :key="i" :verdict="v" />
                  </span>
                  <span v-if="!verdictList(column, row).length" class="text-muted-foreground">—</span>
                </template>
                <template v-else>
                  <span class="inline-flex items-center gap-1.5">
                    <span
                      v-if="column.dot && showVerdicts && column.dot(row)"
                      class="size-2 shrink-0 rounded-full"
                      :class="TONE_DOT[column.dot(row).tone] ?? 'bg-border'"
                      :title="column.dot(row).label"
                    ></span>
                    {{ columnText(column, row) || '—' }}
                  </span>
                </template>
              </slot>
            </TableCell>
          </TableRow>
          <TableRow v-if="!visibleRows.length" class="hover:bg-transparent">
            <TableCell :colspan="shownColumns.length" class="py-6 text-center text-muted-foreground">
              {{ rows.length ? 'No rows match the current search and filters.' : emptyText }}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, DownloadIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import VerdictTag from './VerdictTag.vue'
import { applyTableState, columnText, columnValue, tableToCsv, verdictList } from '@/lib/table.js'
import { downloadText } from '@/lib/download.js'
import { TONE_DOT } from '@/lib/tones.js'
import { useSettingsStore } from '@/stores/settings.js'

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

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
const showVerdicts = computed(() => settings.value.showVerdicts)

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
  downloadText(`${props.exportName}.csv`, tableToCsv(visibleRows.value, shownColumns.value), 'text/csv;charset=utf-8')
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

const sortIcon = (column) => (sortKey.value !== column.key ? ArrowUpDownIcon : sortDir.value === 'asc' ? ArrowUpIcon : ArrowDownIcon)
const ariaSort = (column) => (sortKey.value !== column.key ? 'none' : sortDir.value === 'asc' ? 'ascending' : 'descending')
const cellClass = (column) => (column.type === 'number' || column.align === 'right' ? 'text-right tabular-nums' : '')
</script>
