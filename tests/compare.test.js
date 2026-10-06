import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { compareExams, historyDeltas } from '../src/lib/compare.js'

const breakdown = (masteryPct) => ({ masteryPct })
const profile = (id, name, masteryPct, dims) => ({
  id, name, masteryPct,
  dimensions: Object.fromEntries(Object.entries(dims).map(([d, p]) => [d, breakdown(p)])),
})
const exam = (students, cohortPct, cohortDims) => ({
  students,
  cohort: {
    studentCount: students.length,
    masteryPct: cohortPct,
    dimensions: Object.fromEntries(Object.entries(cohortDims).map(([d, p]) => [d, breakdown(p)])),
  },
})

const base = exam(
  [profile('S1', 'Alice', 60, { Recall: 70, Solve: 50 }), profile('S2', 'Bob', 40, { Recall: 45, Solve: 35 }), profile('S3', 'Cara', 80, { Recall: 80, Solve: 80 })],
  60, { Recall: 65, Solve: 55 }
)
const later = exam(
  [profile('S1', 'Alice', 75, { Recall: 80, Solve: 70, Build: 60 }), profile('S2', 'Bob', 35, { Recall: 40, Solve: 30, Build: 30 }), profile('S9', 'Zed', 50, { Recall: 50, Solve: 50, Build: 50 })],
  53.33, { Recall: 56.67, Solve: 50, Build: 46.67 }
)

describe('compareExams', () => {
  const result = compareExams(base, later)

  it('compares cohort mastery', () => {
    assert.deepEqual(result.cohort, { basePct: 60, laterPct: 53.33, deltaPp: -6.67, baseStudents: 3, laterStudents: 3 })
  })

  it('compares each dimension present in either exam, with null where one exam lacks it', () => {
    const byDim = Object.fromEntries(result.dimensions.map((d) => [d.dimension, d]))
    assert.deepEqual(byDim.Recall, { dimension: 'Recall', basePct: 65, laterPct: 56.67, deltaPp: -8.33 })
    assert.deepEqual(byDim.Build, { dimension: 'Build', basePct: null, laterPct: 46.67, deltaPp: null })
  })

  it('matches students by id and reports their change', () => {
    assert.deepEqual(result.students.map((s) => s.id), ['S1', 'S2'])
    const alice = result.students[0]
    assert.deepEqual([alice.name, alice.baseMasteryPct, alice.laterMasteryPct, alice.deltaPp], ['Alice', 60, 75, 15])
    assert.equal(alice.dimensions.Solve.deltaPp, 20)
    assert.equal(alice.dimensions.Build.deltaPp, null)
  })

  it('lists students that appear in only one exam', () => {
    assert.deepEqual(result.unmatched, { onlyInBase: ['S3'], onlyInLater: ['S9'] })
  })
})

describe('historyDeltas', () => {
  const exams = [
    { examId: 'e1', masteryPct: 50, dimensions: { Recall: { masteryPct: 60 }, Solve: { masteryPct: 40 } } },
    { examId: 'e2', masteryPct: 65, dimensions: { Recall: { masteryPct: 55 }, Solve: { masteryPct: 70 } } },
    { examId: 'e3', masteryPct: 60, dimensions: { Recall: { masteryPct: 55 } } },
  ]

  it('adds the change from the previous exam, null for the first', () => {
    const result = historyDeltas(exams)
    assert.deepEqual(result.map((e) => e.deltaMasteryPct), [null, 15, -5])
    assert.equal(result[1].dimensionDeltas.Recall, -5)
    assert.equal(result[1].dimensionDeltas.Solve, 30)
  })

  it('uses null for a dimension missing from either exam', () => {
    const result = historyDeltas(exams)
    assert.equal(result[2].dimensionDeltas.Solve, null)
    assert.deepEqual(result[0].dimensionDeltas, {})
  })

  it('does not mutate its input', () => {
    historyDeltas(exams)
    assert.ok(!('deltaMasteryPct' in exams[0]))
  })
})
