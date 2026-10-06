import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DIMENSIONS } from '../src/lib/constants.js'
import { CORRELATION_GRADIENT, DIMENSION_COLORS, correlationColor, dimensionColor } from '../src/lib/colors.js'

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

describe('correlationColor', () => {
  const lum = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
    return 0.299 * r + 0.587 * g + 0.114 * b
  }

  it('has no color for a missing coefficient', () => {
    assert.equal(correlationColor(null), null)
    assert.equal(correlationColor(undefined), null)
  })

  it('is near white at zero and distinct for every step of strength', () => {
    assert.ok(lum(correlationColor(0).background) > 235)
    const steps = [0.1, 0.3, 0.5, 0.7, 0.9].map((r) => correlationColor(r).background)
    assert.equal(new Set(steps).size, steps.length)
  })

  it('moves through different hues, not just shades of one', () => {
    const hue = (hex) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      const max = Math.max(r, g, b)
      const d = max - Math.min(r, g, b)
      if (!d) return 0
      return (max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60
    }
    const hues = [0.3, 0.6, 0.95].map((r) => Math.round(hue(correlationColor(r).background)))
    assert.ok(new Set(hues).size === 3, `hues ${hues}`)
    assert.ok(hue(correlationColor(-0.8).background) < 40 || hue(correlationColor(-0.8).background) > 340, 'negative values are red or orange')
  })

  it('is symmetrical in sign only by hue, and clamps outside -1..1', () => {
    assert.notEqual(correlationColor(0.8).background, correlationColor(-0.8).background)
    assert.equal(correlationColor(2).background, correlationColor(1).background)
    assert.equal(correlationColor(-2).background, correlationColor(-1).background)
  })

  it('uses dark text on light cells and white text on dark cells', () => {
    assert.equal(correlationColor(0.05).text, '#0f172a')
    assert.equal(correlationColor(1).text, '#ffffff')
    assert.equal(correlationColor(-1).text, '#ffffff')
  })

  it('exposes the gradient for a legend', () => {
    assert.match(CORRELATION_GRADIENT, /^linear-gradient\(to right, #[0-9a-f]{6}/i)
  })
})
