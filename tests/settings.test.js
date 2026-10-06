import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_SETTINGS,
  SETTINGS_SCHEMA,
  mergeSettings,
  cloneSettings,
  validateSettings,
  getPath,
  setPath,
} from '../src/lib/settings.js'
import { reactive } from 'vue'
import { DIMENSIONS, DIFFICULTIES } from '../src/lib/constants.js'

const leafPaths = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? leafPaths(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  )

describe('default settings', () => {
  it('has the agreed defaults', () => {
    const d = DEFAULT_SETTINGS
    assert.equal(d.showVerdicts, true)
    assert.deepEqual(d.mastery, { weakBelow: 50, strongFrom: 80 })
    assert.deepEqual(d.cohortMargin, { enabled: false, marginPp: 15 })
    assert.deepEqual(d.deviation, { lowBelow: 10, highFrom: 20 })
    assert.deepEqual(d.difficulty, { veryDifficultBelow: 40, difficultBelow: 55, balancedBelow: 70, easyBelow: 85 })
    assert.deepEqual(d.attainment, { passMark: 50, distinctionMark: 75 })
    assert.deepEqual(d.attention, { nearPassMarginPp: 5, weakDimensionCount: 2 })
    assert.equal(d.tiers.inversionTolerancePp, 2)
    assert.deepEqual(d.simulationGap, { alignedBelow: 5, largeFrom: 15 })
    assert.deepEqual(d.dimensionSpread, { balancedBelow: 15, highFrom: 30 })
    assert.deepEqual(d.questionFlags, { tooEasyFrom: 90, tooHardBelow: 20, lowAttemptBelow: 70 })
    assert.deepEqual(d.discrimination, { poorBelow: 0.2, goodFrom: 0.3 })
    assert.equal(d.reliability.acceptableFrom, 0.7)
    assert.equal(d.trend.notableChangePp, 10)
  })

  it('has no blueprint targets until the instructor sets them', () => {
    const { blueprint } = DEFAULT_SETTINGS
    assert.equal(blueprint.tolerancePp, 5)
    assert.deepEqual(Object.keys(blueprint.dimensions), DIMENSIONS)
    assert.deepEqual(Object.keys(blueprint.difficulties), DIFFICULTIES)
    assert.ok(Object.values(blueprint.dimensions).every((v) => v === null))
  })

  it('passes its own validation', () => {
    assert.deepEqual(validateSettings(DEFAULT_SETTINGS), [])
  })
})

describe('settings schema (drives the Settings page)', () => {
  const fields = SETTINGS_SCHEMA.flatMap((g) => g.fields)

  it('describes every setting, once, so the page explains what each rule affects', () => {
    const schemaPaths = fields.map((f) => f.path)
    assert.equal(new Set(schemaPaths).size, schemaPaths.length, 'duplicate field in schema')
    assert.deepEqual([...schemaPaths].sort(), leafPaths(DEFAULT_SETTINGS).sort())
  })

  it('gives every group and field a label and a non-empty description', () => {
    for (const group of SETTINGS_SCHEMA) {
      assert.ok(group.title && group.description.length > 20, `group ${group.title}`)
      for (const f of group.fields) {
        assert.ok(f.label, f.path)
        assert.ok(f.description && f.description.length > 20, `description for ${f.path}`)
        assert.ok(['number', 'boolean', 'target'].includes(f.type), `type for ${f.path}`)
      }
    }
  })
})

describe('getPath / setPath', () => {
  it('read and write nested values without mutating the input', () => {
    const next = setPath(DEFAULT_SETTINGS, 'mastery.weakBelow', 40)
    assert.equal(getPath(next, 'mastery.weakBelow'), 40)
    assert.equal(getPath(DEFAULT_SETTINGS, 'mastery.weakBelow'), 50)
    assert.equal(getPath(next, 'mastery.strongFrom'), 80)
    assert.equal(getPath(DEFAULT_SETTINGS, 'nope.nothing'), undefined)
  })
})

describe('mergeSettings', () => {
  it('returns the defaults for nothing or garbage', () => {
    assert.deepEqual(mergeSettings(), DEFAULT_SETTINGS)
    assert.deepEqual(mergeSettings(null), DEFAULT_SETTINGS)
    assert.deepEqual(mergeSettings('x'), DEFAULT_SETTINGS)
  })

  it('overlays saved values on the defaults, keeping unspecified ones', () => {
    const merged = mergeSettings({ mastery: { weakBelow: 45 }, showVerdicts: false })
    assert.equal(merged.mastery.weakBelow, 45)
    assert.equal(merged.mastery.strongFrom, 80)
    assert.equal(merged.showVerdicts, false)
  })

  it('drops unknown keys and values of the wrong type', () => {
    const merged = mergeSettings({ mastery: { weakBelow: 'lots', bogus: 1 }, extra: true, deviation: { lowBelow: NaN } })
    assert.equal(merged.mastery.weakBelow, 50)
    assert.ok(!('bogus' in merged.mastery))
    assert.ok(!('extra' in merged))
    assert.equal(merged.deviation.lowBelow, 10)
  })

  it('accepts a number or null for blueprint targets', () => {
    const merged = mergeSettings({ blueprint: { dimensions: { Recall: 20, Solve: null, Build: 'x' } } })
    assert.equal(merged.blueprint.dimensions.Recall, 20)
    assert.equal(merged.blueprint.dimensions.Solve, null)
    assert.equal(merged.blueprint.dimensions.Build, null)
  })

  it('never shares objects with the defaults', () => {
    const merged = mergeSettings()
    merged.mastery.weakBelow = 1
    assert.equal(DEFAULT_SETTINGS.mastery.weakBelow, 50)
  })
})

describe('validateSettings', () => {
  const errorsFor = (path, value) => validateSettings(setPath(DEFAULT_SETTINGS, path, value))

  it('rejects values outside a field’s range', () => {
    assert.ok(errorsFor('mastery.weakBelow', -1).some((e) => e.includes('mastery.weakBelow')))
    assert.ok(errorsFor('attainment.passMark', 101).some((e) => e.includes('attainment.passMark')))
    assert.ok(errorsFor('attention.weakDimensionCount', 0).some((e) => e.includes('attention.weakDimensionCount')))
    assert.ok(errorsFor('reliability.acceptableFrom', 1.5).some((e) => e.includes('reliability.acceptableFrom')))
  })

  it('rejects non-numeric values', () => {
    assert.ok(errorsFor('deviation.lowBelow', '10').length > 0)
    assert.ok(errorsFor('deviation.lowBelow', NaN).length > 0)
  })

  it('requires bands to be in order', () => {
    assert.ok(errorsFor('mastery.weakBelow', 90).some((e) => /weak.*strong|strong.*weak/i.test(e)))
    assert.ok(errorsFor('deviation.lowBelow', 25).some((e) => /low.*high|high.*low/i.test(e)))
    assert.ok(errorsFor('difficulty.difficultBelow', 30).length > 0)
    assert.ok(errorsFor('attainment.distinctionMark', 40).length > 0)
    assert.ok(errorsFor('simulationGap.alignedBelow', 20).length > 0)
    assert.ok(errorsFor('dimensionSpread.balancedBelow', 40).length > 0)
    assert.ok(errorsFor('discrimination.poorBelow', 0.5).length > 0)
    assert.ok(errorsFor('questionFlags.tooHardBelow', 95).length > 0)
  })

  it('allows blueprint targets to be empty but not outside 0-100', () => {
    assert.deepEqual(errorsFor('blueprint.dimensions.Recall', null), [])
    assert.deepEqual(errorsFor('blueprint.dimensions.Recall', 25), [])
    assert.ok(errorsFor('blueprint.dimensions.Recall', 120).length > 0)
  })

  it('reports every problem, not just the first', () => {
    let s = setPath(DEFAULT_SETTINGS, 'mastery.weakBelow', -5)
    s = setPath(s, 'attainment.passMark', 200)
    assert.ok(validateSettings(s).length >= 2)
  })
})

describe('cloneSettings', () => {
  it('deep-copies plain data, including NaN and null', () => {
    const copy = cloneSettings({ a: { b: [1, { c: NaN }] }, d: null })
    assert.ok(Number.isNaN(copy.a.b[1].c))
    assert.equal(copy.d, null)
  })

  it('copies Vue reactive objects (which structuredClone cannot)', () => {
    const state = reactive(cloneSettings(DEFAULT_SETTINGS))
    assert.throws(() => structuredClone(state))
    assert.deepEqual(cloneSettings(state), DEFAULT_SETTINGS)
    assert.equal(getPath(setPath(state, 'mastery.weakBelow', 30), 'mastery.weakBelow'), 30)
    assert.equal(state.mastery.weakBelow, 50)
  })
})
