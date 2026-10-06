import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatNumber, formatPct, formatSigned, clampPct } from '../src/lib/format.js'

describe('format', () => {
  it('trims trailing zeros and shows a dash for missing values', () => {
    assert.equal(formatNumber(50), '50')
    assert.equal(formatNumber(47.92), '47.9')
    assert.equal(formatNumber(47.92, 2), '47.92')
    assert.equal(formatNumber(47.5, 2), '47.5')
    assert.equal(formatNumber(100), '100')
    assert.equal(formatNumber(0), '0')
    for (const v of [null, undefined, NaN]) assert.equal(formatNumber(v), '—')
  })

  it('formats percentages and signed differences', () => {
    assert.equal(formatPct(43.75), '43.8%')
    assert.equal(formatPct(null), '—')
    assert.equal(formatSigned(3.33, ' pp'), '+3.3 pp')
    assert.equal(formatSigned(-21.67, ' pp'), '-21.7 pp')
    assert.equal(formatSigned(0, ' pp'), '0 pp')
    assert.equal(formatSigned(null, ' pp'), '—')
  })

  it('clamps bar widths to 0-100', () => {
    assert.deepEqual([clampPct(-5), clampPct(50), clampPct(140), clampPct(null)], [0, 50, 100, 0])
  })
})
