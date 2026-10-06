import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_SIM_PARAMS,
  validateSimParams,
  simulateCohort,
  compareToActual,
} from '../src/lib/simulation.js'
import { loadAnalysis, loadDataset, closeTo } from './fixtures.js'

const singleQuestionDataset = (type, rate, marks = 10) => ({
  questions: [{ id: 'Q1', type, difficulty: 'medium', dimensions: ['Solve'], topics: ['T'], marks, expectedSolveRate: rate }],
  students: [{ id: 'S1', name: 'S1', scores: { Q1: marks } }],
})

describe('validateSimParams', () => {
  it('fills defaults', () => {
    const { params, errors } = validateSimParams({})
    assert.deepEqual(errors, [])
    assert.deepEqual(params, DEFAULT_SIM_PARAMS)
  })

  it('exposes every tunable parameter', () => {
    for (const key of [
      'cohortSize', 'seed', 'abilityMean', 'abilitySd', 'discrimination', 'guessing', 'guessingTypes',
      'partialCreditTypes', 'testCases', 'partialAbilityEffect', 'minExpectedRatePct', 'maxExpectedRatePct',
    ]) {
      assert.ok(key in DEFAULT_SIM_PARAMS, `missing ${key}`)
    }
  })

  it('reports invalid values per parameter', () => {
    const bad = {
      cohortSize: 0,
      abilitySd: -1,
      discrimination: 0,
      guessing: 1,
      testCases: 0,
      minExpectedRatePct: 60,
      maxExpectedRatePct: 40,
      seed: 1.5,
    }
    const { errors } = validateSimParams(bad)
    for (const key of Object.keys(bad)) {
      assert.ok(errors.some((e) => e.includes(key)), `expected an error mentioning ${key}`)
    }
  })

  it('does not mutate its input', () => {
    const input = { cohortSize: 10 }
    validateSimParams(input)
    assert.deepEqual(input, { cohortSize: 10 })
  })
})

describe('simulateCohort', () => {
  let dataset

  before(async () => {
    dataset = await loadDataset()
  })

  it('is deterministic for a given seed and differs across seeds', () => {
    const a = simulateCohort(dataset, { seed: 7, cohortSize: 200 })
    const b = simulateCohort(dataset, { seed: 7, cohortSize: 200 })
    const c = simulateCohort(dataset, { seed: 8, cohortSize: 200 })
    assert.deepEqual(a, b)
    assert.notDeepEqual(a.pct, c.pct)
  })

  it('returns the parameters it used', () => {
    const result = simulateCohort(dataset, { seed: 7, cohortSize: 50, discrimination: 2 })
    assert.equal(result.params.discrimination, 2)
    assert.equal(result.params.cohortSize, 50)
    assert.equal(result.studentCount, 50)
  })

  it('throws on invalid parameters', () => {
    assert.throws(() => simulateCohort(dataset, { cohortSize: 0 }), /cohortSize/)
  })

  it('reproduces the expected solve rate when ability has no spread, including with guessing', () => {
    for (const type of ['Essay', 'MCQ']) {
      const result = simulateCohort(singleQuestionDataset(type, 60), {
        cohortSize: 20000,
        abilitySd: 0,
        guessing: 0.2,
        guessingTypes: ['MCQ'],
        seed: 1,
      })
      assert.ok(closeTo(result.pct.mean, 60, 1.5), `${type}: got ${result.pct.mean}`)
    }
  })

  it('applies guessing only to the configured question types', () => {
    const noGuess = simulateCohort(singleQuestionDataset('Essay', 60), {
      cohortSize: 20000, abilitySd: 3, guessing: 0.5, guessingTypes: ['MCQ'], seed: 3,
    })
    const guess = simulateCohort(singleQuestionDataset('MCQ', 60), {
      cohortSize: 20000, abilitySd: 3, guessing: 0.5, guessingTypes: ['MCQ'], seed: 3,
    })
    // Same ability spread and rate; a guessing floor of 0.5 flattens the success curve.
    assert.ok(noGuess.pct.stdDev > guess.pct.stdDev, `${noGuess.pct.stdDev} should exceed ${guess.pct.stdDev}`)
  })

  it('awards partial credit for the configured types', () => {
    const result = simulateCohort(singleQuestionDataset('Coding', 30), {
      cohortSize: 2000, partialCreditTypes: ['Coding'], testCases: 5, seed: 5,
    })
    const partial = result.markBins.some((b, i) => i > 0 && i < result.markBins.length - 1 && b.count > 0)
    assert.ok(partial, 'some synthetic students land strictly between 0 and full marks')
  })

  it('treats type lists case-insensitively', () => {
    const upper = simulateCohort(singleQuestionDataset('CODING', 30), { cohortSize: 500, partialCreditTypes: ['coding'], seed: 5 })
    const lower = simulateCohort(singleQuestionDataset('coding', 30), { cohortSize: 500, partialCreditTypes: ['CODING'], seed: 5 })
    assert.deepEqual(upper.pct, lower.pct)
  })

  it('uses the CSV expected rate, else the difficulty default, exactly as the solve-rate analysis does', () => {
    const explicit = simulateCohort(singleQuestionDataset('Essay', 20), { cohortSize: 20000, abilitySd: 0, seed: 1 })
    const fallback = simulateCohort(singleQuestionDataset('Essay', null), { cohortSize: 20000, abilitySd: 0, seed: 1 })
    assert.ok(closeTo(explicit.pct.mean, 20, 1.5))
    assert.ok(closeTo(fallback.pct.mean, 55, 1.5), 'medium default is 55')
  })

  it('reports expected mastery per dimension and topic from the same mark-splitting rules as profiles', () => {
    const result = simulateCohort(dataset, { seed: 2, cohortSize: 100 })
    assert.equal(result.dimensions.Recall.availableMarks, 4)
    assert.equal(result.dimensions.Comprehend.availableMarks, 2)
    assert.equal(result.topics.Sorting.availableMarks, 12)
    assert.ok(result.topics.Arrays.expectedMasteryPct >= 0 && result.topics.Arrays.expectedMasteryPct <= 100)
  })

  it('bins the synthetic cohort with the same edges as the actual cohort', () => {
    const result = simulateCohort(dataset, { seed: 2, cohortSize: 100 })
    assert.equal(result.decileBins.length, 10)
    assert.equal(result.markBins.length, 8)
    assert.equal(result.decileBins.reduce((n, b) => n + b.count, 0), 100)
  })
})

describe('compareToActual', () => {
  let analysis, comparison

  before(async () => {
    analysis = await loadAnalysis()
    const sim = simulateCohort(analysis.dataset, { seed: 9, cohortSize: 500 })
    comparison = compareToActual(sim, analysis.profiles, analysis.paper)
  })

  it('compares mean, median and standard deviation as actual minus expected', () => {
    assert.ok(closeTo(comparison.mean.actualPct, 47.92))
    assert.ok(closeTo(comparison.median.actualPct, 43.75))
    assert.ok(closeTo(comparison.mean.gapPp, comparison.mean.actualPct - comparison.mean.expectedPct, 0.02))
    assert.ok('stdDev' in comparison)
  })

  it('compares distributions bin by bin, aligned by index, for both binning modes', () => {
    assert.equal(comparison.decileBins.length, 10)
    assert.equal(comparison.markBins.length, 8)
    const row = comparison.decileBins[0]
    assert.deepEqual(Object.keys(row).sort(), ['actualCount', 'actualPct', 'deltaPp', 'expectedCount', 'expectedPct', 'label'].sort())
    assert.equal(comparison.decileBins[9].actualCount, 1)
    assert.equal(comparison.markBins[7].actualCount, 1)
  })

  it('reports a total variation distance between the two distributions', () => {
    const tv = comparison.distributionDistancePct
    assert.ok(tv >= 0 && tv <= 100)
    const manual = comparison.decileBins.reduce((sum, b) => sum + Math.abs(b.deltaPp), 0) / 2
    assert.ok(closeTo(tv, manual, 0.05))
  })

  it('compares dimension and topic mastery with no status labels or recommendations', () => {
    const recall = comparison.dimensions.find((d) => d.dimension === 'Recall')
    assert.equal(recall.actualMasteryPct, 50)
    assert.ok(closeTo(recall.gapPp, 50 - recall.expectedMasteryPct, 0.02))
    assert.ok(comparison.topics.some((t) => t.topic === 'Sorting'))
    for (const key of ['status', 'statusLabel', 'recommendation']) assert.ok(!(key in recall))
    assert.ok(!('insights' in comparison))
  })
})
