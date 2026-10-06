import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { applyTableState, matchesNumericFilter, columnText } from '../src/lib/table.js'

const rows = [
  { id: 'S1', name: 'Alice', score: 90, dims: ['Recall', 'Solve'] },
  { id: 'S2', name: 'bob', score: 45.5, dims: ['Build'] },
  { id: 'S10', name: 'Cara', score: null, dims: [] },
  { id: 'S3', name: 'Dan', score: 70, dims: ['Recall'] },
]

const columns = [
  { key: 'id', label: 'ID', type: 'text' },
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'score', label: 'Score', type: 'number', format: (v) => (v == null ? '—' : `${v}%`) },
  { key: 'dims', label: 'Dimensions', type: 'text' },
  { key: 'computed', label: 'Double', type: 'number', value: (r) => (r.score == null ? null : r.score * 2) },
]

const ids = (result) => result.map((r) => r.id)

describe('matchesNumericFilter', () => {
  it('supports comparison operators', () => {
    assert.equal(matchesNumericFilter(50, '>40'), true)
    assert.equal(matchesNumericFilter(40, '>40'), false)
    assert.equal(matchesNumericFilter(40, '>=40'), true)
    assert.equal(matchesNumericFilter(40, '<=40'), true)
    assert.equal(matchesNumericFilter(40, '<40'), false)
    assert.equal(matchesNumericFilter(40, '=40'), true)
    assert.equal(matchesNumericFilter(40, '40'), true)
  })

  it('supports inclusive ranges with .. or -', () => {
    assert.equal(matchesNumericFilter(50, '40..60'), true)
    assert.equal(matchesNumericFilter(60, '40-60'), true)
    assert.equal(matchesNumericFilter(61, '40..60'), false)
    assert.equal(matchesNumericFilter(-2, '-5..0'), true)
  })

  it('treats a blank expression as matching everything, and null values as matching nothing otherwise', () => {
    assert.equal(matchesNumericFilter(null, ''), true)
    assert.equal(matchesNumericFilter(null, '>0'), false)
  })

  it('returns null for an expression it cannot parse', () => {
    assert.equal(matchesNumericFilter(5, 'abc'), null)
  })
})

describe('columnText', () => {
  it('uses the formatter, joins arrays and renders null as an empty string', () => {
    assert.equal(columnText(columns[2], rows[0]), '90%')
    assert.equal(columnText(columns[3], rows[0]), 'Recall, Solve')
    assert.equal(columnText({ key: 'x' }, { x: null }), '')
  })
})

describe('applyTableState: search', () => {
  it('matches case-insensitively across every column', () => {
    assert.deepEqual(ids(applyTableState(rows, columns, { search: 'BOB' })), ['S2'])
    assert.deepEqual(ids(applyTableState(rows, columns, { search: 'recall' })), ['S1', 'S3'])
  })

  it('matches formatted text as displayed', () => {
    assert.deepEqual(ids(applyTableState(rows, columns, { search: '45.5%' })), ['S2'])
  })

  it('returns all rows for a blank search', () => {
    assert.equal(applyTableState(rows, columns, { search: '  ' }).length, 4)
  })
})

describe('applyTableState: column filters', () => {
  it('filters text columns by case-insensitive substring', () => {
    assert.deepEqual(ids(applyTableState(rows, columns, { filters: { name: 'a' } })), ['S1', 'S10', 'S3'])
  })

  it('filters number columns by expression, using the value accessor when present', () => {
    assert.deepEqual(ids(applyTableState(rows, columns, { filters: { score: '>=70' } })), ['S1', 'S3'])
    assert.deepEqual(ids(applyTableState(rows, columns, { filters: { computed: '<100' } })), ['S2'])
  })

  it('falls back to substring matching when a number expression is not parseable', () => {
    assert.deepEqual(ids(applyTableState(rows, columns, { filters: { score: '%' } })), ['S1', 'S2', 'S3'])
  })

  it('combines filters and search with AND', () => {
    const state = { search: 'recall', filters: { score: '>80' } }
    assert.deepEqual(ids(applyTableState(rows, columns, state)), ['S1'])
  })

  it('ignores empty filters', () => {
    assert.equal(applyTableState(rows, columns, { filters: { name: '', score: '' } }).length, 4)
  })
})

describe('applyTableState: sorting', () => {
  it('sorts numbers numerically, ascending and descending', () => {
    assert.deepEqual(ids(applyTableState(rows, columns, { sortKey: 'score', sortDir: 'asc' })), ['S2', 'S3', 'S1', 'S10'])
    assert.deepEqual(ids(applyTableState(rows, columns, { sortKey: 'score', sortDir: 'desc' })), ['S1', 'S3', 'S2', 'S10'])
  })

  it('always places missing values last', () => {
    const asc = applyTableState(rows, columns, { sortKey: 'score', sortDir: 'asc' })
    const desc = applyTableState(rows, columns, { sortKey: 'score', sortDir: 'desc' })
    assert.equal(asc.at(-1).id, 'S10')
    assert.equal(desc.at(-1).id, 'S10')
  })

  it('sorts text naturally and case-insensitively', () => {
    assert.deepEqual(ids(applyTableState(rows, columns, { sortKey: 'id', sortDir: 'asc' })), ['S1', 'S2', 'S3', 'S10'])
    assert.deepEqual(ids(applyTableState(rows, columns, { sortKey: 'name', sortDir: 'asc' })), ['S1', 'S2', 'S10', 'S3'])
  })

  it('sorts by a value accessor and by array columns', () => {
    assert.deepEqual(ids(applyTableState(rows, columns, { sortKey: 'computed', sortDir: 'desc' })), ['S1', 'S3', 'S2', 'S10'])
    assert.equal(applyTableState(rows, columns, { sortKey: 'dims', sortDir: 'asc' })[0].id, 'S10')
  })

  it('is stable and does not mutate the input', () => {
    const copy = rows.map((r) => r.id)
    const sorted = applyTableState(rows, columns, { sortKey: 'name', sortDir: 'desc' })
    assert.notEqual(sorted, rows)
    assert.deepEqual(rows.map((r) => r.id), copy)
  })

  it('leaves input order when no sort key is given', () => {
    assert.deepEqual(ids(applyTableState(rows, columns, {})), ['S1', 'S2', 'S10', 'S3'])
  })
})
