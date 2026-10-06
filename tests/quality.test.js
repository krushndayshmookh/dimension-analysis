import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { checkDataQuality } from '../src/lib/quality.js'
import { DEFAULT_SETTINGS as S, setPath } from '../src/lib/settings.js'
import { loadDataset } from './fixtures.js'

const dataset = (scoresByStudent, questionIds = Object.keys(Object.values(scoresByStudent)[0])) => ({
  questions: questionIds.map((id) => ({ id, type: 'assessment', difficulty: 'easy', dimensions: ['Recall'], topics: ['T'], marks: 2, expectedSolveRate: null, correctOption: null })),
  students: Object.entries(scoresByStudent).map(([id, scores]) => ({ id, name: id, section: null, scores })),
})

describe('checkDataQuality', () => {
  it('has nothing to say about ordinary data', () => {
    assert.deepEqual(checkDataQuality(dataset({ S1: { Q1: 2, Q2: 1 }, S2: { Q1: 0, Q2: 2 } }), S), [])
  })

  it('notes students who scored zero on every question they attempted', async () => {
    const warnings = checkDataQuality(await loadDataset(), S)
    assert.ok(warnings.some((w) => w.includes('S3') && /zero/i.test(w)), warnings.join(' | '))
  })

  it('notes students who attempted nothing', () => {
    const warnings = checkDataQuality(dataset({ S1: { Q1: 2 }, S2: {} }, ['Q1']), S)
    assert.ok(warnings.some((w) => w.includes('S2') && /no question/i.test(w)))
    assert.ok(!warnings.some((w) => /zero on every/i.test(w) && w.includes('S2')), 'not also reported as scoring zero')
  })

  it('notes students who left at least the configured share of questions blank', () => {
    const d = dataset({ S1: { Q1: 2, Q2: 1, Q3: 1, Q4: 2 }, S2: { Q1: 1 } }, ['Q1', 'Q2', 'Q3', 'Q4'])
    assert.ok(checkDataQuality(d, S).some((w) => w.includes('S2') && /blank/i.test(w)))
    const lenient = setPath(S, 'quality.heavySkipFrom', 90)
    assert.ok(!checkDataQuality(d, lenient).some((w) => w.includes('S2') && /blank/i.test(w)))
  })

  it('notes questions nobody attempted', () => {
    const d = dataset({ S1: { Q1: 2 }, S2: { Q1: 1 } }, ['Q1', 'Q2'])
    assert.ok(checkDataQuality(d, S).some((w) => w.includes('Q2') && /no student|nobody/i.test(w)))
  })

  it('lists at most ten ids and says how many more', () => {
    const many = Object.fromEntries(Array.from({ length: 14 }, (_, i) => [`S${i}`, { Q1: 0 }]))
    const warning = checkDataQuality(dataset({ ...many, X: { Q1: 2 } }), S).find((w) => /zero/i.test(w))
    assert.ok(warning.includes('14 student'))
    assert.ok(warning.includes('and 4 more'))
  })
})
