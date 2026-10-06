import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { distributionRows, distributionColumns } from '../src/lib/distribution.js'
import { decileBins, markBins } from '../src/lib/stats.js'

const students = new Map([
  ['a', { id: 'a', name: 'Alice', masteryPct: 95, earned: 19 }],
  ['b', { id: 'b', name: 'Bob', masteryPct: 5, earned: 1 }],
])
const dist = {
  decileBins: decileBins([{ id: 'a', pct: 95 }, { id: 'b', pct: 5 }]),
  markBins: markBins([{ id: 'a', earned: 19 }, { id: 'b', earned: 1 }], 20),
}
const valueOf = (s) => `${s.masteryPct}%`

describe('distributionRows', () => {
  it('lists the highest range first for percentage bins', () => {
    const rows = distributionRows(dist, 'percentage', students, valueOf)
    assert.equal(rows[0].label, '90-100%')
    assert.equal(rows.at(-1).label, '0-10%')
    assert.equal(rows.length, 10)
  })

  it('lists the highest range first for marks bins', () => {
    const rows = distributionRows(dist, 'raw', students, valueOf)
    assert.equal(rows[0].label, '18-20')
    assert.equal(rows.at(-1).label, '0-2')
  })

  it('carries the count, share and who is in each bin', () => {
    const [top] = distributionRows(dist, 'percentage', students, valueOf)
    assert.deepEqual([top.count, top.percentage], [1, 50])
    assert.deepEqual(top.students, [{ id: 'a', label: 'Alice (95%)' }])
  })

  it('does not change the bins it is given', () => {
    distributionRows(dist, 'percentage', students, valueOf)
    assert.equal(dist.decileBins[0].label, '0-10%')
  })
})

describe('distributionColumns', () => {
  it('labels the range column by mode and ends with the bar and the students', () => {
    assert.equal(distributionColumns('percentage')[0].label, 'Range (%)')
    assert.equal(distributionColumns('raw')[0].label, 'Range (marks)')
    assert.deepEqual(distributionColumns('raw').map((c) => c.key).slice(-2), ['bar', 'students'])
  })
})
