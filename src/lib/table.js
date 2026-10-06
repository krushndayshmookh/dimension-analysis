// Pure filter / search / sort logic behind DataTable.vue.
//
// A column is { key, label, type: 'text' | 'number', value?: (row) => any,
// format?: (value, row) => string }. `value` defaults to row[key].

export const columnValue = (column, row) => (column.value ? column.value(row) : row[column.key])

const asText = (value) => {
  if (value == null) return ''
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

// The text a user sees (and searches) for a cell.
export const columnText = (column, row) => {
  const value = columnValue(column, row)
  return column.format ? asText(column.format(value, row)) : asText(value)
}

const NUMBER = '(-?\\d+(?:\\.\\d+)?)'
const COMPARISON = new RegExp(`^(>=|<=|>|<|=)?\\s*${NUMBER}$`)
const RANGE = new RegExp(`^${NUMBER}\\s*(?:\\.\\.|-)\\s*${NUMBER}$`)

// Expressions: ">50", ">=50", "<50", "<=50", "=50", "50", "40..60", "40-60".
// Returns true/false, or null when the expression cannot be parsed.
export function matchesNumericFilter(value, expression) {
  const expr = String(expression ?? '').trim()
  if (!expr) return true
  const range = RANGE.exec(expr)
  const comparison = range ? null : COMPARISON.exec(expr)
  if (!range && !comparison) return null
  if (value == null || !Number.isFinite(Number(value))) return false
  const n = Number(value)
  if (range) {
    const [a, b] = [Number(range[1]), Number(range[2])]
    return n >= Math.min(a, b) && n <= Math.max(a, b)
  }
  const target = Number(comparison[2])
  switch (comparison[1]) {
    case '>': return n > target
    case '>=': return n >= target
    case '<': return n < target
    case '<=': return n <= target
    default: return n === target
  }
}

const contains = (haystack, needle) => haystack.toLowerCase().includes(needle.trim().toLowerCase())

function matchesColumnFilter(column, row, filter) {
  if (!String(filter ?? '').trim()) return true
  if (column.type === 'number') {
    const result = matchesNumericFilter(columnValue(column, row), filter)
    if (result !== null) return result
  }
  return contains(columnText(column, row), filter)
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

function compare(column, a, b) {
  const va = columnValue(column, a)
  const vb = columnValue(column, b)
  if (column.type === 'number') return Number(va) - Number(vb)
  return collator.compare(asText(va), asText(vb))
}

const isMissing = (column, row) => {
  const value = columnValue(column, row)
  if (column.type === 'number') return value == null || !Number.isFinite(Number(value))
  return value == null
}

// Returns a new array; never mutates `rows`. Missing values sort last in both directions.
export function applyTableState(rows, columns, { search = '', filters = {}, sortKey = null, sortDir = 'asc' } = {}) {
  const byKey = new Map(columns.map((c) => [c.key, c]))
  const query = search.trim()

  let result = rows.filter((row) => {
    if (query && !columns.some((c) => contains(columnText(c, row), query))) return false
    for (const [key, filter] of Object.entries(filters)) {
      const column = byKey.get(key)
      if (column && !matchesColumnFilter(column, row, filter)) return false
    }
    return true
  })

  const sortColumn = sortKey ? byKey.get(sortKey) : null
  if (sortColumn) {
    const direction = sortDir === 'desc' ? -1 : 1
    result = result
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const missingA = isMissing(sortColumn, a.row)
        const missingB = isMissing(sortColumn, b.row)
        if (missingA || missingB) return missingA === missingB ? a.index - b.index : missingA ? 1 : -1
        return direction * compare(sortColumn, a.row, b.row) || a.index - b.index
      })
      .map((entry) => entry.row)
  }
  return result
}

const csvCell = (value) => {
  const text = value == null ? '' : Array.isArray(value) ? value.join('; ') : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// CSV of the given rows: header labels, then raw (unformatted) values. Columns
// with exportable: false (e.g. bar charts) are skipped.
export function tableToCsv(rows, columns) {
  const exported = columns.filter((c) => c.exportable !== false)
  const lines = [exported.map((c) => csvCell(c.label)).join(',')]
  for (const row of rows) lines.push(exported.map((c) => csvCell(columnValue(c, row))).join(','))
  return `${lines.join('\n')}\n`
}
