import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_SIM_PARAMS,
  validateSimParams,
  simulateCohort,
  simulateMany,
  compareToActual,
} from '../src/lib/simulation.js'
import { loadAnalysis, loadDataset, closeTo } from './fixtures.js'

// One question and a single student; `observed` are the scores that decide
// whether the question is detected as partial credit.
const singleQuestionDataset = ({ rate, marks = 10, correctOption = null, observed = [marks] }) => ({
  questions: [{
    id: 'Q1', type: 'assessment', difficulty: 'medium', dimensions: ['Solve'], topics: ['T'],
    marks, expectedSolveRate: rate, correctOption,
  }],
  students: observed.map((score, i) => ({ id: `S${i}`, name: `S${i}`, section: null, scores: { Q1: score } })),
})

describe('validateSimParams', () => {
  it('fills defaults', () => {
    const { params, errors } = validateSimParams({})
    assert.deepEqual(errors, [])
    assert.deepEqual(params, DEFAULT_SIM_PARAMS)
  })

  it('exposes every tunable parameter and no question-type lists', () => {
    for (const key of [
      'cohortSize', 'seed', 'runs', 'abilityMean', 'abilitySd', 'discrimination', 'guessing',
      'partialCredit', 'testCases', 'partialAbilityEffect', 'minExpectedRatePct', 'maxExpectedRatePct',
    ]) {
      assert.ok(key in DEFAULT_SIM_PARAMS, `missing ${key}`)
    }
    assert.ok(!('guessingTypes' in DEFAULT_SIM_PARAMS))
    assert.ok(!('partialCreditTypes' in DEFAULT_SIM_PARAMS))
  })

  it('reports invalid values per parameter', () => {
    const bad = {
      cohortSize: 0, abilitySd: -1, discrimination: 0, guessing: 1, testCases: 0,
      minExpectedRatePct: 60, maxExpectedRatePct: 40, seed: 1.5, runs: 0, partialCredit: 'sometimes',
    }
    const { errors } = validateSimParams(bad)
    for (const key of Object.keys(bad)) {
      assert.ok(errors.some((e) => e.includes(key)), `expected an error mentioning ${key}`)
    }
  })

  it('limits the total work (cohort size x runs)', () => {
    const { errors } = validateSimParams({ cohortSize: 100000, runs: 100 })
    assert.ok(errors.some((e) => e.includes('runs')))
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

  it('reproduces the expected solve rate when ability has no spread, with or without guessing', () => {
    for (const correctOption of [null, 'B']) {
      const result = simulateCohort(singleQuestionDataset({ rate: 60, correctOption }), {
        cohortSize: 20000, abilitySd: 0, guessing: 0.2, seed: 1,
      })
      assert.ok(closeTo(result.pct.mean, 60, 1.5), `${correctOption}: got ${result.pct.mean}`)
    }
  })

  it('applies the guessing floor only to questions with an answer key', () => {
    const options = { cohortSize: 20000, abilitySd: 3, guessing: 0.5, seed: 3 }
    const open = simulateCohort(singleQuestionDataset({ rate: 60 }), options)
    const multipleChoice = simulateCohort(singleQuestionDataset({ rate: 60, correctOption: 'A' }), options)
    // Same ability spread and rate; a guessing floor of 0.5 flattens the success curve.
    assert.ok(open.pct.stdDev > multipleChoice.pct.stdDev, `${open.pct.stdDev} should exceed ${multipleChoice.pct.stdDev}`)
    assert.equal(open.modes.guessing, 0)
    assert.equal(multipleChoice.modes.guessing, 1)
  })

  describe('partial credit', () => {
    const interior = (r) => r.markBins.some((b, i) => i > 0 && i < r.markBins.length - 1 && b.count > 0)
    const partialObserved = { rate: 30, observed: [10, 5, 0, 10] }
    const fullOnly = { rate: 30, observed: [10, 0, 10, 0] }

    it('is detected from the actual scores by default', () => {
      const detected = simulateCohort(singleQuestionDataset(partialObserved), { cohortSize: 2000, seed: 5 })
      assert.ok(interior(detected))
      assert.equal(detected.modes.partialCredit, 1)
      const notDetected = simulateCohort(singleQuestionDataset(fullOnly), { cohortSize: 2000, seed: 5 })
      assert.ok(!interior(notDetected), 'all-or-nothing questions stay all-or-nothing')
      assert.equal(notDetected.modes.partialCredit, 0)
    })

    it('can be forced for every question or switched off', () => {
      const all = simulateCohort(singleQuestionDataset(fullOnly), { cohortSize: 2000, seed: 5, partialCredit: 'all' })
      assert.ok(interior(all))
      const none = simulateCohort(singleQuestionDataset(partialObserved), { cohortSize: 2000, seed: 5, partialCredit: 'none' })
      assert.ok(!interior(none))
    })

    it('uses the configured number of test cases', () => {
      const two = simulateCohort(singleQuestionDataset(partialObserved), { cohortSize: 3000, seed: 5, testCases: 2 })
      const distinct = (r) => r.markBins.filter((b) => b.count > 0).length
      assert.ok(distinct(two) <= 10)
      assert.ok(interior(two))
    })

    it('does not apply guessing to a partial-credit question', () => {
      const result = simulateCohort(singleQuestionDataset({ ...partialObserved, correctOption: 'A' }), { cohortSize: 100, seed: 5 })
      assert.equal(result.modes.guessing, 0)
      assert.equal(result.modes.partialCredit, 1)
    })
  })

  it('uses the CSV expected rate, else the difficulty default, exactly as the solve-rate analysis does', () => {
    const explicit = simulateCohort(singleQuestionDataset({ rate: 20 }), { cohortSize: 20000, abilitySd: 0, seed: 1 })
    const fallback = simulateCohort(singleQuestionDataset({ rate: null }), { cohortSize: 20000, abilitySd: 0, seed: 1 })
    assert.ok(closeTo(explicit.pct.mean, 20, 1.5))
    assert.ok(closeTo(fallback.pct.mean, 55, 1.5), 'medium default is 55')
  })

  it('reports how each question was modelled', () => {
    const result = simulateCohort(dataset, { seed: 2, cohortSize: 10 })
    assert.deepEqual(result.questions.map((q) => q.id), ['Q1', 'Q2', 'Q3'])
    assert.ok(result.questions.every((q) => ['full', 'partial'].includes(q.mode)))
    assert.equal(result.modes.partialCredit + result.modes.standard, 3)
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

describe('simulateMany (range over repeated runs)', () => {
  let dataset
  before(async () => {
    dataset = await loadDataset()
  })
  const options = { seed: 11, cohortSize: 300, runs: 20 }

  it('returns the single run for the given seed plus a range over all runs', () => {
    const many = simulateMany(dataset, options)
    const single = simulateCohort(dataset, options)
    assert.deepEqual(many.pct, single.pct)
    assert.equal(many.bands.runs, 20)
  })

  it('is deterministic', () => {
    assert.deepEqual(simulateMany(dataset, options), simulateMany(dataset, options))
  })

  it('gives a 90% range for the mean, median and standard deviation', () => {
    const { bands } = simulateMany(dataset, options)
    for (const key of ['mean', 'median', 'stdDev']) {
      const b = bands[key]
      assert.ok(b.lowPct <= b.meanPct && b.meanPct <= b.highPct, `${key}: ${JSON.stringify(b)}`)
    }
    assert.ok(bands.mean.highPct > bands.mean.lowPct, 'runs differ')
  })

  it('gives a range for each decile bin and each dimension', () => {
    const { bands } = simulateMany(dataset, options)
    assert.equal(bands.decileBins.length, 10)
    for (const b of bands.decileBins) assert.ok(b.lowPct <= b.meanPct && b.meanPct <= b.highPct)
    assert.deepEqual(Object.keys(bands.dimensions), ['Recall', 'Comprehend', 'Solve'])
  })

  it('collapses to a point with a single run', () => {
    const { bands } = simulateMany(dataset, { ...options, runs: 1 })
    assert.equal(bands.mean.lowPct, bands.mean.highPct)
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

  it('adds the range and whether the actual value falls inside it when given repeated runs', () => {
    const many = simulateMany(analysis.dataset, { seed: 9, cohortSize: 300, runs: 20 })
    const withBands = compareToActual(many, analysis.profiles, analysis.paper)
    const mean = withBands.mean
    assert.ok('lowPct' in mean && 'highPct' in mean)
    assert.equal(mean.withinRange, mean.actualPct >= mean.lowPct && mean.actualPct <= mean.highPct)
    const bin = withBands.decileBins[9]
    assert.ok('lowPct' in bin && 'highPct' in bin && typeof bin.withinRange === 'boolean')
    const recall = withBands.dimensions.find((d) => d.dimension === 'Recall')
    assert.ok('lowPct' in recall && typeof recall.withinRange === 'boolean')
    assert.ok(!('lowPct' in comparison.mean), 'no range without repeated runs')
  })
})
