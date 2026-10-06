import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeAttempts, buildReviewQueue } from '../src/lib/review.js'
import { DEFAULT_SETTINGS as S, setPath } from '../src/lib/settings.js'
import { buildProfiles } from '../src/lib/profiles.js'
import { loadAnalysis, loadDataset, closeTo } from './fixtures.js'

describe('analyzeAttempts', () => {
  let result
  before(async () => {
    const { dataset, profiles } = await loadAnalysis()
    result = analyzeAttempts(dataset, profiles)
  })
  const q = (id) => result.questions.find((r) => r.id === id)

  it('reports each question’s position and attempt counts', () => {
    assert.deepEqual(result.questions.map((r) => [r.id, r.position]), [['Q1', 1], ['Q2', 2], ['Q3', 3]])
    assert.deepEqual([q('Q1').attemptedCount, q('Q1').skippedCount, q('Q1').attemptRatePct], [3, 0, 100])
    assert.deepEqual([q('Q2').attemptedCount, q('Q2').skippedCount], [2, 1])
    assert.ok(closeTo(q('Q2').attemptRatePct, 66.67))
  })

  it('splits attempts into zero, partial and full marks', () => {
    assert.deepEqual([q('Q1').zeroCount, q('Q1').partialCount, q('Q1').fullCount], [1, 0, 2])
    assert.deepEqual([q('Q3').zeroCount, q('Q3').partialCount, q('Q3').fullCount], [1, 1, 1])
    assert.ok(closeTo(q('Q3').zeroRateOfAttemptedPct, 33.33))
  })

  it('compares the overall mastery of students who skipped a question with those who attempted it', () => {
    assert.equal(q('Q2').skipperMeanMasteryPct, 0)
    assert.ok(closeTo(q('Q2').attempterMeanMasteryPct, 71.88))
    assert.ok(closeTo(q('Q2').attempterMinusSkipperPp, 71.88))
    assert.equal(q('Q1').skipperMeanMasteryPct, null, 'nobody skipped it')
    assert.equal(q('Q1').attempterMinusSkipperPp, null)
  })

  it('summarises each student’s skipping', () => {
    const s3 = result.students.find((s) => s.id === 'S3')
    assert.deepEqual([s3.attemptedCount, s3.skippedCount, s3.skippedMarks], [2, 1, 4])
    assert.ok(closeTo(s3.attemptRatePct, 66.67))
    assert.equal(s3.skippedMarksPct, 25)
    assert.equal(result.students.find((s) => s.id === 'S1').skippedCount, 0)
  })

  it('totals the marks forgone to skipping across the cohort', () => {
    assert.equal(result.totals.skippedMarks, 4)
    assert.ok(closeTo(result.totals.skippedMarksPct, 8.33))
    assert.ok(closeTo(result.totals.meanStudentAttemptRatePct, 88.89))
  })
})

describe('buildReviewQueue', () => {
  const row = (id, over = {}) => ({
    id, type: 'assessment', solveRatePct: 60, attemptRatePct: 95, deviationPct: 2,
    discriminationIndex: 0.4, alphaIfRemoved: 0.6, ...over,
  })
  const reliability = { alpha: 0.7 }
  const queue = (rows, reuse = {}, settings = S) => buildReviewQueue({ rows, reliability, reuse, settings })
  const reasons = (entry) => entry.reasons.map((r) => r.id)

  it('leaves out questions with nothing to review', () => {
    assert.deepEqual(queue([row('Q1')]), [])
  })

  it('gives each reason a label and tone', () => {
    const [entry] = queue([row('Q1', { discriminationIndex: -0.2 })])
    assert.deepEqual(entry.reasons[0], { id: 'negative-discrimination', label: 'Negative discrimination', tone: 'bad' })
  })

  it('raises each of the review reasons', () => {
    assert.ok(reasons(queue([row('A', { discriminationIndex: 0.1 })])[0]).includes('poor-discrimination'))
    assert.ok(reasons(queue([row('B', { deviationPct: -25 })])[0]).includes('high-deviation'))
    assert.ok(reasons(queue([row('C', { deviationPct: 14 })])[0]).includes('medium-deviation'))
    assert.ok(reasons(queue([row('D', { attemptRatePct: 50 })])[0]).includes('low-attempt'))
    assert.ok(reasons(queue([row('E', { alphaIfRemoved: 0.75 })])[0]).includes('lowers-reliability'))
    assert.ok(reasons(queue([row('F', { solveRatePct: 95 })])[0]).includes('too-easy'))
    assert.ok(reasons(queue([row('G', { solveRatePct: 10 })])[0]).includes('too-hard'))
  })

  it('flags a question that lowers reliability only when removing it gains at least the configured amount', () => {
    assert.deepEqual(queue([row('A', { alphaIfRemoved: 0.71 })]), [])
    assert.equal(queue([row('A', { alphaIfRemoved: 0.72 })]).length, 1)
    const strict = setPath(S, 'review.alphaGainFrom', 0.1)
    assert.deepEqual(queue([row('A', { alphaIfRemoved: 0.75 })], {}, strict), [])
  })

  it('flags reused questions with how many earlier exams they appeared in, unless turned off', () => {
    const reuse = { Q1: [{ examId: 'e1' }, { examId: 'e2' }] }
    const [entry] = queue([row('Q1')], reuse)
    assert.deepEqual(entry.reasons.map((r) => [r.id, r.label, r.tone]), [['reused', 'Reused (2 earlier exams)', 'warn']])
    assert.deepEqual(queue([row('Q1')], reuse, setPath(S, 'review.flagReuse', false)), [])
    assert.equal(queue([row('Q1')], { Q1: [{ examId: 'e1' }] })[0].reasons[0].label, 'Reused (1 earlier exam)')
  })

  it('ranks by severity, then paper order, and reports the severity', () => {
    const rows = [
      row('Q1', { solveRatePct: 95 }),
      row('Q2', { discriminationIndex: -0.3, deviationPct: 30 }),
      row('Q3', { attemptRatePct: 40 }),
      row('Q4', { solveRatePct: 95 }),
    ]
    const result = queue(rows)
    assert.deepEqual(result.map((r) => r.id), ['Q2', 'Q3', 'Q1', 'Q4'])
    assert.ok(result[0].severity > result[1].severity && result[1].severity > result[2].severity)
    assert.equal(result[2].severity, result[3].severity)
  })

  it('copes with missing statistics', () => {
    const blank = row('Q1', { solveRatePct: null, attemptRatePct: null, deviationPct: null, discriminationIndex: null, alphaIfRemoved: null })
    assert.deepEqual(queue([blank]), [])
    assert.deepEqual(buildReviewQueue({ rows: [row('Q1', { alphaIfRemoved: 0.9 })], reliability: { alpha: null }, reuse: {}, settings: S }), [])
  })
})

describe('absent students in attempt analysis', () => {
  const absentCsv = 'student_id,student_name,attendance\nS1,Alice,\nS2,Bob,\nS3,Cara,absent\n'
  let result
  before(async () => {
    const dataset = await loadDataset(undefined, undefined, absentCsv)
    result = analyzeAttempts(dataset, buildProfiles(dataset))
  })

  it('leaves them out of the attempt rates', () => {
    const q2 = result.questions.find((r) => r.id === 'Q2')
    assert.deepEqual([q2.attemptedCount, q2.skippedCount, q2.attemptRatePct], [2, 0, 100])
  })

  it('does not list them as students who skipped, and reports how many were absent', () => {
    assert.deepEqual(result.students.map((s) => s.id), ['S1', 'S2'])
    assert.equal(result.totals.absentCount, 1)
    assert.equal(result.totals.skippedMarks, 0)
  })
})

describe('what each student did not attempt', () => {
  it('lists the question ids left blank, in paper order', async () => {
    const { dataset, profiles } = await loadAnalysis()
    const rows = analyzeAttempts(dataset, profiles).students
    assert.deepEqual(rows.find((s) => s.id === 'S3').skippedIds, ['Q2'])
    assert.deepEqual(rows.find((s) => s.id === 'S1').skippedIds, [])
  })
})
