import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { assignBand, bandDistribution, cutoffCurve, borderlineStudents } from '../src/lib/bands.js'
import { DEFAULT_SETTINGS } from '../src/lib/settings.js'
import { closeTo } from './fixtures.js'

const bands = DEFAULT_SETTINGS.bands

describe('default bands', () => {
  it('are A 80, B 65, C 50, D 40, F 0', () => {
    assert.deepEqual(bands.map((b) => [b.label, b.from]), [['A', 80], ['B', 65], ['C', 50], ['D', 40], ['F', 0]])
  })
})

describe('assignBand', () => {
  it('gives the highest band whose lower limit the mastery reaches', () => {
    assert.equal(assignBand(100, bands), 'A')
    assert.equal(assignBand(80, bands), 'A')
    assert.equal(assignBand(79.99, bands), 'B')
    assert.equal(assignBand(50, bands), 'C')
    assert.equal(assignBand(0, bands), 'F')
  })

  it('has no band for a missing value', () => {
    assert.equal(assignBand(null, bands), null)
  })

  it('does not depend on the order the bands are given in', () => {
    assert.equal(assignBand(70, [...bands].reverse()), 'B')
  })
})

describe('bandDistribution', () => {
  const students = [
    { id: 'S1', masteryPct: 100 },
    { id: 'S2', masteryPct: 43.75 },
    { id: 'S3', masteryPct: 0 },
    { id: 'S4', masteryPct: 85 },
  ]
  const result = bandDistribution(students, bands)

  it('counts students per band, highest band first, with the range of each', () => {
    assert.deepEqual(result.map((b) => [b.label, b.count]), [['A', 2], ['B', 0], ['C', 0], ['D', 1], ['F', 1]])
    assert.deepEqual([result[0].from, result[0].to], [80, 100])
    assert.deepEqual([result[1].from, result[1].to], [65, 80])
    assert.deepEqual(result[0].studentIds, ['S1', 'S4'])
  })

  it('gives each band’s share of the students', () => {
    assert.deepEqual(result.map((b) => b.percentage), [50, 0, 0, 25, 25])
  })

  it('handles no students', () => {
    assert.ok(bandDistribution([], bands).every((b) => b.count === 0 && b.percentage === 0))
  })
})

describe('cutoffCurve', () => {
  const curve = cutoffCurve([100, 43.75, 0, 85])

  it('gives, for every whole-number cutoff 0-100, how many students are at or above it', () => {
    assert.equal(curve.length, 101)
    assert.deepEqual([curve[0].count, curve[40].count, curve[44].count, curve[50].count, curve[85].count, curve[86].count, curve[100].count], [4, 3, 2, 2, 2, 1, 1])
  })

  it('also gives the share of students', () => {
    assert.equal(curve[0].ratePct, 100)
    assert.equal(curve[50].ratePct, 50)
  })

  it('has no rate with no students', () => {
    assert.equal(cutoffCurve([])[50].ratePct, null)
  })
})

describe('borderlineStudents', () => {
  const students = [
    { id: 'S1', name: 'A', masteryPct: 100, totalMarks: 16 },
    { id: 'S2', name: 'B', masteryPct: 43.75, totalMarks: 16 },
    { id: 'S3', name: 'C', masteryPct: 48, totalMarks: 16 },
    { id: 'S4', name: 'D', masteryPct: 30, totalMarks: 16 },
  ]

  it('lists students below the cutoff by no more than the margin, closest first', () => {
    const list = borderlineStudents(students, 50, 10)
    assert.deepEqual(list.map((s) => s.id), ['S3', 'S2'])
    assert.ok(closeTo(list[1].shortfallPp, 6.25))
    assert.ok(closeTo(list[1].marksShort, 1))
  })

  it('does not include students at or above the cutoff', () => {
    assert.deepEqual(borderlineStudents(students, 48, 10).map((s) => s.id), ['S2'], 'S3 is exactly at 48')
  })

  it('includes a student exactly at the margin', () => {
    assert.deepEqual(borderlineStudents(students, 50, 20).map((s) => s.id), ['S3', 'S2', 'S4'])
  })
})
