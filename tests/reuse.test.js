import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { questionSummaries, findReuse, reuseSummary } from '../src/lib/reuse.js'
import { loadAnalysis } from './fixtures.js'

const summary = (id, type, solveRatePct) => ({
  id, type, difficulty: 'easy', marks: 2, studentCount: 30,
  solveRatePct, expectedSolveRatePct: 70, meanScorePct: solveRatePct, attemptRatePct: 95, discriminationIndex: 0.3,
})
const entry = (id, date, summaries, extra = {}) => ({
  id, courseName: 'CS101', examTitle: `Exam ${id}`, examDate: date, studentCount: 30, questionSummaries: summaries, ...extra,
})

describe('questionSummaries', () => {
  it('keeps the compact per-question results needed to compare exams later', async () => {
    const { paper } = await loadAnalysis()
    const rows = questionSummaries(paper)
    assert.deepEqual(rows.map((r) => [r.id, r.type]), [['Q1', 'assessment'], ['Q2', 'assessment'], ['Q3', 'assignment']])
    assert.deepEqual(Object.keys(rows[0]).sort(), [
      'attemptRatePct', 'difficulty', 'discriminationIndex', 'expectedSolveRatePct', 'id', 'marks',
      'meanScorePct', 'solveRatePct', 'studentCount', 'type',
    ])
    assert.equal(rows[0].studentCount, 3)
  })
})

describe('findReuse', () => {
  const index = [
    entry('e1', '2026-01-10', [summary('Q1', 'assessment', 50), summary('Q2', 'assignment', 40)]),
    entry('e2', '2026-03-10', [summary('Q1', 'assignment', 80), summary('Q9', 'assessment', 60)]),
    entry('e3', '2026-02-10', [summary('q1', 'assessment', 65)]),
    entry('old', '2025-01-01', undefined),
  ]
  const current = [{ id: 'Q1', type: 'assessment' }, { id: 'Q2', type: 'assessment' }, { id: 'Q3', type: 'assignment' }]

  it('matches a question only when both its type and its id match (id ignoring case)', () => {
    const reuse = findReuse('current', current, index)
    assert.deepEqual(Object.keys(reuse), ['Q1'])
    assert.deepEqual(reuse.Q1.map((a) => a.examId), ['e1', 'e3'], 'e2 has Q1 but as an assignment; e1.Q2 is an assignment')
  })

  it('lists appearances oldest first with the earlier results', () => {
    const [first] = findReuse('current', current, index).Q1
    assert.equal(first.examTitle, 'Exam e1')
    assert.equal(first.examDate, '2026-01-10')
    assert.equal(first.solveRatePct, 50)
    assert.equal(first.studentCount, 30)
  })

  it('ignores the exam being viewed and entries saved without question summaries', () => {
    const reuse = findReuse('e1', current, index)
    assert.deepEqual(reuse.Q1.map((a) => a.examId), ['e3'])
    assert.deepEqual(findReuse('x', [{ id: 'Z', type: 'assessment' }], index), {})
  })

  it('works with no saved exams', () => {
    assert.deepEqual(findReuse(null, current, []), {})
  })
})

describe('reuseSummary', () => {
  it('counts reused questions and the exams they came from', () => {
    const reuse = { Q1: [{ examId: 'e1' }, { examId: 'e3' }], Q2: [{ examId: 'e1' }] }
    assert.deepEqual(reuseSummary(4, reuse), { questionCount: 4, reusedCount: 2, reusedPct: 50, examCount: 2 })
    assert.deepEqual(reuseSummary(0, {}), { questionCount: 0, reusedCount: 0, reusedPct: null, examCount: 0 })
  })
})
