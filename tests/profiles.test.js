import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { buildProfiles } from '../src/lib/profiles.js'
import { loadDataset, closeTo } from './fixtures.js'

describe('buildProfiles', () => {
  let profiles
  const student = (id) => profiles.students.find((s) => s.id === id)

  before(async () => {
    profiles = buildProfiles(await loadDataset())
  })

  it('lists the dimensions, difficulties and topics present, in canonical order', () => {
    assert.equal(profiles.totalMarks, 16)
    assert.deepEqual(profiles.dimensions, ['Recall', 'Comprehend', 'Solve'])
    assert.deepEqual(profiles.difficulties, ['easy', 'medium', 'hard'])
    assert.deepEqual(profiles.topics, ['Arrays', 'Sorting'])
  })

  it('keeps students in input order with their names', () => {
    assert.deepEqual(profiles.students.map((s) => [s.id, s.name]), [['S1', 'Alice'], ['S2', 'Bob'], ['S3', 'Cara']])
  })

  it('computes mastery against all exam marks and accuracy against attempted marks', () => {
    const s1 = student('S1')
    assert.equal(s1.earned, 16)
    assert.equal(s1.masteryPct, 100)
    assert.equal(s1.accuracyPct, 100)

    const s2 = student('S2')
    assert.equal(s2.earned, 7)
    assert.ok(closeTo(s2.masteryPct, 43.75))

    const s3 = student('S3')
    assert.equal(s3.earned, 0)
    assert.equal(s3.attemptedMarks, 12, 'Q2 was left blank, so it is not attempted')
    assert.equal(s3.masteryPct, 0)
    assert.equal(s3.accuracyPct, 0)
  })

  it('splits a multi-dimension question equally across its dimensions', () => {
    const s2 = student('S2')
    assert.equal(s2.dimensions.Recall.availableExam, 4, 'Q1 (2) + half of Q2 (2)')
    assert.equal(s2.dimensions.Recall.earned, 2)
    assert.equal(s2.dimensions.Recall.masteryPct, 50)
    assert.equal(s2.dimensions.Comprehend.availableExam, 2)
    assert.equal(s2.dimensions.Comprehend.masteryPct, 0)
    assert.equal(s2.dimensions.Solve.masteryPct, 50)
  })

  it('splits a multi-topic question equally across its topics', () => {
    const s2 = student('S2')
    assert.equal(s2.topics.Arrays.availableExam, 4)
    assert.equal(s2.topics.Arrays.masteryPct, 50)
    assert.equal(s2.topics.Sorting.availableExam, 12)
    assert.ok(closeTo(s2.topics.Sorting.masteryPct, 41.67))
  })

  it('reports difficulty breakdowns', () => {
    assert.equal(student('S2').difficulties.hard.earned, 5)
    assert.equal(student('S2').difficulties.easy.availableExam, 2)
  })

  it('uses null, not 0, where a percentage has no denominator', () => {
    const s3 = student('S3')
    assert.equal(s3.dimensions.Comprehend.availableAttempted, 0)
    assert.equal(s3.dimensions.Comprehend.accuracyPct, null)
    assert.equal(s3.dimensions.Comprehend.masteryPct, 0)
  })

  it('identifies strongest and lowest dimensions without thresholds, first dimension winning ties', () => {
    const s2 = student('S2')
    assert.equal(s2.strongestDimension, 'Recall')
    assert.equal(s2.weakestDimension, 'Comprehend')
    assert.equal(student('S1').weakestDimension, 'Recall')
  })

  it('reports the difference from the cohort in percentage points per dimension', () => {
    const s2 = student('S2')
    assert.equal(s2.dimensionVsCohort.Recall, 0)
    assert.ok(closeTo(s2.dimensionVsCohort.Comprehend, -33.33))
  })

  it('averages the cohort across students using exam-level available marks', () => {
    const c = profiles.cohort
    assert.equal(c.studentCount, 3)
    assert.ok(closeTo(c.earned, 7.67))
    assert.ok(closeTo(c.attemptedMarks, 14.67))
    assert.ok(closeTo(c.masteryPct, 47.92))
    assert.ok(closeTo(c.accuracyPct, 52.27))
    assert.equal(c.dimensions.Recall.availableExam, 4)
    assert.equal(c.dimensions.Recall.earned, 2)
    assert.equal(c.dimensions.Recall.masteryPct, 50)
    assert.equal(c.weakestDimension, 'Comprehend')
    assert.equal(c.strongestDimension, 'Recall')
  })

  it('does not carry legacy duplicate fields', () => {
    const s = student('S1')
    for (const legacy of ['pct', 'accuracy', 'dimension', 'difficulty', 'topic', 'total', 'attempted', 'weakDimensions', 'strongDimensions']) {
      assert.ok(!(legacy in s), `unexpected legacy field ${legacy}`)
    }
    for (const legacy of ['pct', 'accuracy', 'available', 'attempted']) {
      assert.ok(!(legacy in s.dimensions.Recall), `unexpected legacy field ${legacy}`)
    }
  })

  it('handles a cohort of one', async () => {
    const dataset = await loadDataset()
    dataset.students = dataset.students.slice(0, 1)
    const single = buildProfiles(dataset)
    assert.equal(single.cohort.masteryPct, 100)
    assert.equal(single.students[0].dimensionVsCohort.Recall, 0)
  })
})
