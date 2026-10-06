import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { round, describe as describeValues, decileBins, markBins, niceStep } from '../src/lib/stats.js'
import { closeTo } from './fixtures.js'

describe('round', () => {
  it('rounds to the requested decimals', () => {
    assert.equal(round(1.005, 2), 1.01)
    assert.equal(round(2.5, 0), 3)
    assert.equal(round(7.666666, 2), 7.67)
  })
})

describe('describe (distribution statistics)', () => {
  it('computes count, mean, median, min, max and population standard deviation', () => {
    const stats = describeValues([2, 4, 4, 4, 5, 5, 7, 9])
    assert.equal(stats.count, 8)
    assert.equal(stats.mean, 5)
    assert.equal(stats.median, 4.5)
    assert.equal(stats.min, 2)
    assert.equal(stats.max, 9)
    assert.equal(stats.stdDev, 2)
  })

  it('uses the middle value for an odd count', () => {
    assert.equal(describeValues([9, 1, 5]).median, 5)
  })

  it('returns null statistics for no values, never zeros', () => {
    const stats = describeValues([])
    assert.equal(stats.count, 0)
    for (const key of ['mean', 'median', 'min', 'max', 'stdDev']) assert.equal(stats[key], null)
  })

  it('ignores non-finite values', () => {
    assert.equal(describeValues([1, NaN, null, undefined, 3]).count, 2)
  })
})

describe('decileBins', () => {
  const items = (pcts) => pcts.map((pct, i) => ({ id: `s${i}`, pct }))

  it('always returns ten ascending bins labelled by percentage range', () => {
    const bins = decileBins([])
    assert.equal(bins.length, 10)
    assert.equal(bins[0].label, '0-10%')
    assert.equal(bins[9].label, '90-100%')
    assert.ok(bins.every((b) => b.count === 0 && b.percentage === 0))
  })

  it('uses half-open bins: a boundary value belongs to the higher bin', () => {
    const bins = decileBins(items([0, 10, 29.99, 30, 99.99]))
    assert.deepEqual(bins.map((b) => b.count), [1, 1, 1, 1, 0, 0, 0, 0, 0, 1])
  })

  it('puts exactly 100 in the last bin', () => {
    assert.equal(decileBins(items([100]))[9].count, 1)
  })

  it('records student ids and the share of the cohort per bin', () => {
    const bins = decileBins(items([5, 5, 55, 95]))
    assert.deepEqual(bins[0].studentIds, ['s0', 's1'])
    assert.equal(bins[0].percentage, 50)
    assert.equal(bins[5].percentage, 25)
  })

  it('skips items without a finite percentage', () => {
    const bins = decileBins([{ id: 'a', pct: null }, { id: 'b', pct: 50 }])
    assert.equal(bins.reduce((n, b) => n + b.count, 0), 1)
    assert.equal(bins[5].percentage, 100)
  })
})

describe('niceStep', () => {
  it('picks 1, 2, 5, 10 x 10^k steps giving at most about ten bins', () => {
    assert.equal(niceStep(10), 1)
    assert.equal(niceStep(16), 2)
    assert.equal(niceStep(50), 5)
    assert.equal(niceStep(100), 10)
    assert.equal(niceStep(135), 20)
    assert.equal(niceStep(3), 1)
  })
})

describe('markBins', () => {
  const items = (marks) => marks.map((earned, i) => ({ id: `s${i}`, earned }))

  it('covers 0..total with equal-width bins and a shorter last bin', () => {
    const bins = markBins([], 135)
    assert.equal(bins.length, 7)
    assert.deepEqual([bins[0].minMarks, bins[0].maxMarks], [0, 20])
    assert.deepEqual([bins[6].minMarks, bins[6].maxMarks], [120, 135])
    assert.equal(bins[0].label, '0-20')
  })

  it('is half-open except that the full total belongs to the last bin', () => {
    const bins = markBins(items([0, 1.99, 2, 15, 16]), 16)
    assert.equal(bins.length, 8)
    assert.equal(bins[0].count, 2)
    assert.equal(bins[1].count, 1)
    assert.equal(bins[7].count, 2)
  })

  it('produces the same edges for the same total so cohorts can be compared by index', () => {
    const a = markBins(items([1]), 90)
    const b = markBins(items([80, 20, 33]), 90)
    assert.deepEqual(a.map((x) => x.label), b.map((x) => x.label))
  })

  it('returns no bins when the total is not positive', () => {
    assert.deepEqual(markBins(items([1]), 0), [])
  })

  it('computes percentages of the cohort', () => {
    const bins = markBins(items([0, 0, 0, 16]), 16)
    assert.ok(closeTo(bins[0].percentage, 75))
    assert.ok(closeTo(bins[7].percentage, 25))
  })
})
