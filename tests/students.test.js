import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { filterStudentItems, sectionOptions, NO_SECTION } from '../src/lib/students.js'

const items = [
  { id: 'S1', name: 'Alice Chen', section: 'A' },
  { id: 'S2', name: 'Bob Martinez', section: 'B' },
  { id: 'S10', name: 'Cara Kim', section: 'A' },
  { id: 'S3', name: 'Dan Cho', section: null },
]
const ids = (list) => list.map((i) => i.id)

describe('filterStudentItems', () => {
  it('returns everyone for an empty query and section', () => {
    assert.deepEqual(ids(filterStudentItems(items, {})), ['S1', 'S2', 'S10', 'S3'])
  })

  it('matches the name or the id, ignoring case', () => {
    assert.deepEqual(ids(filterStudentItems(items, { query: 'CHEN' })), ['S1'])
    assert.deepEqual(ids(filterStudentItems(items, { query: 's1' })), ['S1', 'S10'])
  })

  it('filters by section, including students with no section', () => {
    assert.deepEqual(ids(filterStudentItems(items, { section: 'A' })), ['S1', 'S10'])
    assert.deepEqual(ids(filterStudentItems(items, { section: NO_SECTION })), ['S3'])
  })

  it('combines query and section', () => {
    assert.deepEqual(ids(filterStudentItems(items, { query: 'k', section: 'A' })), ['S10'])
  })
})

describe('sectionOptions', () => {
  it('lists the sections in order, and whether some students have none', () => {
    assert.deepEqual(sectionOptions(items), { sections: ['A', 'B'], hasUnassigned: true })
    assert.deepEqual(sectionOptions([{ id: 'x', name: 'x', section: null }]), { sections: [], hasUnassigned: false })
    assert.deepEqual(sectionOptions([{ id: 'x', name: 'x', section: 'B' }]), { sections: ['B'], hasUnassigned: false })
  })
})
