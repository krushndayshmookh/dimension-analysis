import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { applyAdjustments, runScenario } from '../src/lib/whatif.js'
import { analyzeDataset } from '../src/lib/analysis.js'
import { DEFAULT_SETTINGS as S } from '../src/lib/settings.js'
import { loadDataset, closeTo } from './fixtures.js'

const student = (dataset, id) => dataset.students.find((s) => s.id === id)

describe('applyAdjustments', () => {
  let dataset
  before(async () => {
    dataset = await loadDataset()
  })

  it('returns the dataset unchanged when there are no adjustments', () => {
    assert.deepEqual(applyAdjustments(dataset, {}), dataset)
  })

  it('never changes the dataset it is given', () => {
    const copy = structuredClone(dataset)
    applyAdjustments(dataset, { Q3: 'drop', Q2: 'full-all' })
    assert.deepEqual(dataset, copy)
  })

  it('drops a question and its scores', () => {
    const adjusted = applyAdjustments(dataset, { Q3: 'drop' })
    assert.deepEqual(adjusted.questions.map((q) => q.id), ['Q1', 'Q2'])
    assert.deepEqual(student(adjusted, 'S1').scores, { Q1: 2, Q2: 4 })
    assert.deepEqual(student(adjusted, 'S3').scores, { Q1: 0 })
  })

  it('gives full marks to everyone, including students who left it blank', () => {
    const adjusted = applyAdjustments(dataset, { Q2: 'full-all' })
    for (const id of ['S1', 'S2', 'S3']) assert.equal(student(adjusted, id).scores.Q2, 4)
    assert.equal(adjusted.questions.length, 3)
  })

  it('gives full marks only to students who attempted it', () => {
    const adjusted = applyAdjustments(dataset, { Q2: 'full-attempted' })
    assert.equal(student(adjusted, 'S2').scores.Q2, 4)
    assert.ok(!('Q2' in student(adjusted, 'S3').scores), 'still unattempted')
  })

  it('rejects unknown questions, unknown actions, and dropping every question', () => {
    assert.throws(() => applyAdjustments(dataset, { Q9: 'drop' }), /Q9/)
    assert.throws(() => applyAdjustments(dataset, { Q1: 'halve' }), /halve/)
    assert.throws(() => applyAdjustments(dataset, { Q1: 'drop', Q2: 'drop', Q3: 'drop' }), /at least one/i)
  })

  it('ignores "none" entries', () => {
    assert.deepEqual(applyAdjustments(dataset, { Q1: 'none' }), dataset)
  })
})

describe('runScenario', () => {
  let dataset, base
  before(async () => {
    dataset = await loadDataset()
    base = analyzeDataset(dataset)
  })
  const run = (adjustments) => runScenario(dataset, base, adjustments, S)
  const row = (result, id) => result.students.find((s) => s.id === id)

  it('analyses the rescored paper', () => {
    const { adjusted } = run({ Q3: 'drop' })
    assert.equal(adjusted.profiles.totalMarks, 6)
    assert.ok(closeTo(adjusted.profiles.students.find((s) => s.id === 'S2').masteryPct, 33.33))
  })

  it('compares the cohort before and after', () => {
    const { summary } = run({ Q2: 'full-all' })
    assert.ok(closeTo(summary.mean.basePct, 47.92))
    assert.ok(closeTo(summary.mean.adjustedPct, 64.58))
    assert.ok(closeTo(summary.mean.deltaPp, 16.67))
    assert.deepEqual([summary.totalMarks.base, summary.totalMarks.adjusted], [16, 16])
  })

  it('counts passes and distinctions before and after', () => {
    const { summary } = run({ Q2: 'full-all' })
    assert.deepEqual([summary.pass.baseCount, summary.pass.adjustedCount, summary.pass.deltaCount], [1, 2, 1])
    assert.deepEqual([summary.distinction.baseCount, summary.distinction.adjustedCount], [1, 1])
  })

  it('reports each student’s change, rank change and pass-mark crossing', () => {
    const result = run({ Q2: 'full-all' })
    const s2 = row(result, 'S2')
    assert.ok(closeTo(s2.basePct, 43.75) && closeTo(s2.adjustedPct, 68.75) && closeTo(s2.deltaPp, 25))
    assert.equal(s2.passChange, 'gained')
    assert.deepEqual([s2.baseRank, s2.adjustedRank, s2.rankChange], [2, 2, 0])
    assert.equal(row(result, 'S1').passChange, null)
    assert.equal(row(result, 'S3').passChange, null)
  })

  it('reports students who gain or lose a pass', () => {
    const result = run({ Q1: 'drop', Q2: 'drop' })   // only Q3 remains: S2 scores 5/10 = 50%, up from 43.75%
    assert.equal(row(result, 'S2').passChange, 'gained')
    const harsher = runScenario(dataset, base, { Q3: 'drop' }, { ...S, attainment: { passMark: 40, distinctionMark: 75 } })
    assert.equal(row(harsher, 'S2').passChange, 'lost', '43.75% before, 33.33% after, against a 40% pass mark')
  })

  it('reports a rank change in the direction the student moved', () => {
    const swapped = { ...dataset, students: dataset.students.map((s) => (s.id === 'S3' ? { ...s, scores: { Q1: 2, Q3: 8 } } : s)) }
    const swappedBase = analyzeDataset(swapped)
    const result = runScenario(swapped, swappedBase, { Q3: 'drop' }, S)
    // Before: S1 100, S3 62.5, S2 43.75. After dropping Q3: S1 100, S3 33.33 (2 of 6), S2 33.33 -> tie at rank 2
    assert.deepEqual([row(result, 'S2').baseRank, row(result, 'S2').adjustedRank, row(result, 'S2').rankChange], [3, 2, 1])
    assert.equal(row(result, 'S3').rankChange, 0, 'moved from 2 to 2 (tied)')
  })

  it('compares reliability', () => {
    const { summary } = run({ Q3: 'drop' })
    assert.ok('baseAlpha' in summary.reliability && 'adjustedAlpha' in summary.reliability && 'delta' in summary.reliability)
  })

  it('reports no change for no adjustments', () => {
    const { summary, students } = run({})
    assert.equal(summary.mean.deltaPp, 0)
    assert.ok(students.every((s) => s.deltaPp === 0 && s.rankChange === 0 && s.passChange === null))
  })
})
