import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { buildFeedback, DEFAULT_FEEDBACK_OPTIONS, feedbackFileName } from '../src/lib/feedback.js'
import { loadAnalysis, closeTo } from './fixtures.js'

describe('buildFeedback', () => {
  let ctx
  before(async () => {
    const { dataset, profiles, paper } = await loadAnalysis()
    ctx = { dataset, profiles, paper, exam: { courseName: 'CS101', examTitle: 'Midterm', examDate: '2026-03-01' } }
  })
  const sheet = (id, options = {}) => buildFeedback(ctx.profiles.students.find((s) => s.id === id), ctx, { ...DEFAULT_FEEDBACK_OPTIONS, ...options })

  it('identifies the exam and the student', () => {
    assert.deepEqual(sheet('S2').header, {
      courseName: 'CS101', examTitle: 'Midterm', examDate: '2026-03-01', studentId: 'S2', studentName: 'Bob', section: 'A',
    })
  })

  it('reports the student’s own marks', () => {
    const { overall } = sheet('S2')
    assert.deepEqual([overall.earned, overall.totalMarks, overall.attemptedMarks], [7, 16, 16])
    assert.ok(closeTo(overall.masteryPct, 43.75))
    assert.ok(closeTo(overall.accuracyPct, 43.75))
  })

  it('lists each dimension with marks and mastery', () => {
    const recall = sheet('S2').dimensions.find((d) => d.dimension === 'Recall')
    assert.deepEqual([recall.earned, recall.availableExam, recall.masteryPct], [2, 4, 50])
    assert.deepEqual(sheet('S2').dimensions.map((d) => d.dimension), ['Recall', 'Comprehend', 'Solve'])
  })

  it('names the topics with the lowest mastery, as many as requested, with no advice', () => {
    const topics = sheet('S2', { lowestTopics: 1 }).lowestTopics
    assert.deepEqual(topics.map((t) => t.topic), ['Sorting'])
    assert.ok(closeTo(topics[0].masteryPct, 41.67))
    assert.deepEqual(sheet('S2', { lowestTopics: 2 }).lowestTopics.map((t) => t.topic), ['Sorting', 'Arrays'])
    assert.deepEqual(sheet('S2', { lowestTopics: 0 }).lowestTopics, [])
  })

  it('lists every question with the marks earned, null where it was left blank', () => {
    const rows = sheet('S3').questions
    assert.deepEqual(rows.map((q) => [q.id, q.earned, q.marks, q.attempted]), [['Q1', 0, 2, true], ['Q2', null, 4, false], ['Q3', 0, 10, true]])
    assert.deepEqual(rows[1].dimensions, ['Recall', 'Comprehend'])
    assert.equal(sheet('S3', { showQuestionMarks: false }).questions, undefined)
  })

  it('leaves out rank and percentile unless asked for', () => {
    const plain = sheet('S2')
    assert.ok(!('rank' in plain.overall) && !('percentile' in plain.overall))
    const ranked = sheet('S2', { showRank: true, showPercentile: true })
    assert.deepEqual([ranked.overall.rank, ranked.overall.studentCount], [2, 3])
    assert.equal(ranked.overall.percentile, 50)
  })

  it('leaves out the cohort average unless asked for', () => {
    const plain = sheet('S2')
    assert.ok(!('cohortMasteryPct' in plain.overall))
    assert.ok(plain.dimensions.every((d) => !('cohortMasteryPct' in d)))
    assert.equal(plain.radar.reference, undefined)
    const withCohort = sheet('S2', { showCohortAverage: true })
    assert.ok(closeTo(withCohort.overall.cohortMasteryPct, 47.92))
    const recall = withCohort.dimensions.find((d) => d.dimension === 'Recall')
    assert.deepEqual([recall.cohortMasteryPct, recall.differencePp], [50, 0])
    assert.equal(withCohort.radar.reference.Recall, 50)
  })

  it('gives the radar values for the student', () => {
    assert.deepEqual(sheet('S2').radar.values, { Recall: 50, Comprehend: 0, Solve: 50 })
  })

  it('includes the instructor comment, when given', () => {
    assert.equal(sheet('S2').comment, '')
    assert.equal(sheet('S2', { comment: 'Well done on Solve.' }).comment, 'Well done on Solve.')
  })

  it('has safe defaults: marks and topics yes; rank, percentile, cohort and levels no', () => {
    assert.deepEqual(DEFAULT_FEEDBACK_OPTIONS, {
      lowestTopics: 3, showRank: false, showPercentile: false, showCohortAverage: false, showLevels: false, showQuestionMarks: true, comment: '',
    })
  })
})

describe('feedbackFileName', () => {
  it('is a safe file name from the id and name', () => {
    assert.equal(feedbackFileName({ studentId: 'S101', studentName: 'Alice Chen' }), 'feedback-S101-alice-chen')
    assert.equal(feedbackFileName({ studentId: 'a/b', studentName: '   ' }), 'feedback-a-b')
  })
})
