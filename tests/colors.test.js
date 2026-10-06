import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DIMENSIONS } from '../src/lib/constants.js'
import { DIMENSION_COLORS, dimensionColor } from '../src/lib/colors.js'

describe('dimension colors', () => {
  it('gives every dimension a distinct color', () => {
    const colors = DIMENSIONS.map((d) => DIMENSION_COLORS[d])
    assert.ok(colors.every((c) => /^#[0-9a-f]{6}$/i.test(c)))
    assert.equal(new Set(colors).size, DIMENSIONS.length)
  })

  it('falls back to a neutral color for unknown names', () => {
    assert.equal(dimensionColor('Other'), '#64748b')
  })
})
