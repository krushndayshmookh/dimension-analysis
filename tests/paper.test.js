import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { resolveExpectedSolveRate } from '../src/lib/expected.js'
import { DEFAULT_EXPECTED_SOLVE_RATES } from '../src/lib/constants.js'
import { loadAnalysis, loadDataset, closeTo } from './fixtures.js'

describe('resolveExpectedSolveRate', () => {
  it('uses the CSV rate when present', () => {
    assert.deepEqual(resolveExpectedSolveRate({ difficulty: 'easy', expectedSolveRate: 80 }), { ratePct: 80, source: 'csv' })
  })

  it('treats an explicit 0 as a CSV rate, not as missing', () => {
    assert.deepEqual(resolveExpectedSolveRate({ difficulty: 'easy', expectedSolveRate: 0 }), { ratePct: 0, source: 'csv' })
  })

  it('falls back to the per-difficulty default otherwise', () => {
    for (const [difficulty, rate] of Object.entries(DEFAULT_EXPECTED_SOLVE_RATES)) {
      assert.deepEqual(resolveExpectedSolveRate({ difficulty, expectedSolveRate: null }), { ratePct: rate, source: 'difficulty-default' })
    }
  })
})

describe('analyzePaper', () => {
  let paper

  before(async () => {
    ;({ paper } = await loadAnalysis())
  })

  describe('overall distribution', () => {
    it('describes mastery and earned marks across students', () => {
      const { overall } = paper
      assert.equal(overall.studentCount, 3)
      assert.equal(overall.totalMarks, 16)
      assert.ok(closeTo(overall.pct.mean, 47.92))
      assert.ok(closeTo(overall.pct.median, 43.75))
      assert.equal(overall.pct.min, 0)
      assert.equal(overall.pct.max, 100)
      assert.ok(closeTo(overall.pct.stdDev, 40.93, 0.02))
      assert.ok(closeTo(overall.earned.mean, 7.67))
    })

    it('bins students by percentage and by marks with student ids', () => {
      const { decileBins, markBins } = paper.overall
      assert.deepEqual(decileBins.map((b) => b.count), [1, 0, 0, 0, 1, 0, 0, 0, 0, 1])
      assert.deepEqual(decileBins[4].studentIds, ['S2'])
      assert.equal(markBins.length, 8)
      assert.equal(markBins[3].count, 1, '7 marks falls in 6-8')
      assert.equal(markBins[7].count, 1)
    })

    it('does not label difficulty with verdicts', () => {
      assert.ok(!('verdict' in paper.overall))
    })
  })

  describe('dimensions', () => {
    it('reports per-dimension available marks and distribution of student mastery', () => {
      const recall = paper.dimensions.find((d) => d.dimension === 'Recall')
      assert.equal(recall.questionCount, 2)
      assert.equal(recall.availableMarks, 4)
      assert.equal(recall.pct.mean, 50, 'students score 100, 50, 0')
      assert.equal(recall.pct.min, 0)
      assert.equal(recall.decileBins.length, 10)
      assert.equal(recall.markBins.reduce((n, b) => n + b.count, 0), 3)
    })

    it('lists only dimensions that have questions', () => {
      assert.deepEqual(paper.dimensions.map((d) => d.dimension), ['Recall', 'Comprehend', 'Solve'])
    })
  })

  describe('difficulty tiers', () => {
    it('reports tier size, share of exam and mastery distribution', () => {
      const hard = paper.difficulties.find((d) => d.difficulty === 'hard')
      assert.equal(hard.questionCount, 1)
      assert.equal(hard.availableMarks, 10)
      assert.equal(hard.shareOfExamPct, 62.5)
      assert.equal(hard.pct.mean, 50)
      assert.equal(hard.pct.max, 100)
    })

    it('does not flag anomalies or progression statuses', () => {
      assert.ok(!('anomalies' in paper))
      assert.ok(!('progression' in paper))
    })
  })

  describe('dimension x difficulty matrix', () => {
    it('holds cohort-average earned marks and mastery per cell', () => {
      const { matrix } = paper
      const recallEasy = matrix.cells.Recall.easy
      assert.equal(recallEasy.availableMarks, 2)
      assert.deepEqual(recallEasy.questionIds, ['Q1'])
      assert.ok(closeTo(recallEasy.meanEarned, 1.33))
      assert.ok(closeTo(recallEasy.masteryPct, 66.67))

      const recallMedium = matrix.cells.Recall.medium
      assert.equal(recallMedium.availableMarks, 2, 'half of Q2')
      assert.ok(closeTo(recallMedium.masteryPct, 33.33))

      assert.equal(matrix.cells.Solve.hard.masteryPct, 50)
    })

    it('has null mastery, not 0, for cells with no questions', () => {
      const cell = paper.matrix.cells.Solve.easy
      assert.equal(cell.availableMarks, 0)
      assert.equal(cell.masteryPct, null)
    })

    it('computes row, column and grand totals', () => {
      const { rowTotals, colTotals, grandTotal } = paper.matrix
      assert.equal(rowTotals.Recall.availableMarks, 4)
      assert.equal(rowTotals.Recall.masteryPct, 50)
      assert.equal(colTotals.medium.availableMarks, 4)
      assert.ok(closeTo(colTotals.medium.masteryPct, 33.33))
      assert.equal(grandTotal.availableMarks, 16)
      assert.ok(closeTo(grandTotal.masteryPct, 47.92))
    })
  })

  describe('topics', () => {
    it('reports cohort mastery per topic with split marks', () => {
      const sorting = paper.topics.find((t) => t.topic === 'Sorting')
      assert.equal(sorting.questionCount, 2)
      assert.equal(sorting.availableMarks, 12)
      assert.ok(closeTo(sorting.meanEarned, 5.67), `got ${sorting.meanEarned}`)
      assert.ok(closeTo(sorting.masteryPct, 47.22))
    })
  })

  describe('question solve rates', () => {
    const q = (id) => paper.questions.rows.find((r) => r.id === id)

    it('counts a question as solved only when full marks are earned', () => {
      assert.equal(q('Q1').solvedCount, 2)
      assert.equal(q('Q3').solvedCount, 1, 'S2 earned 5 of 10')
    })

    it('computes solve rate over all students and over attempting students', () => {
      assert.ok(closeTo(q('Q2').solveRatePct, 33.33))
      assert.equal(q('Q2').attemptedCount, 2)
      assert.equal(q('Q2').attemptedSolveRatePct, 50)
      assert.ok(closeTo(q('Q1').solveRatePct, 66.67))
    })

    it('computes mean score as a share of the maximum', () => {
      assert.ok(closeTo(q('Q2').meanEarned, 1.33))
      assert.ok(closeTo(q('Q2').meanScorePct, 33.33))
    })

    it('uses the CSV expected rate or the difficulty default, and says which', () => {
      assert.equal(q('Q1').expectedSolveRatePct, 80)
      assert.equal(q('Q1').expectedSource, 'csv')
      assert.equal(q('Q2').expectedSolveRatePct, DEFAULT_EXPECTED_SOLVE_RATES.medium)
      assert.equal(q('Q2').expectedSource, 'difficulty-default')
    })

    it('reports the deviation as actual minus expected, without labels or alert flags', () => {
      assert.ok(closeTo(q('Q1').deviationPct, -13.33))
      assert.ok(closeTo(q('Q2').deviationPct, -21.67))
      assert.ok(closeTo(q('Q3').deviationPct, 3.33))
      for (const key of ['alignment', 'alignmentLabel', 'isHighDeviation']) assert.ok(!(key in q('Q1')))
    })

    it('summarises deviations numerically', () => {
      const { summary } = paper.questions
      assert.ok(closeTo(summary.meanAbsDeviationPct, 12.78, 0.02))
      assert.equal(summary.largestNegative.id, 'Q2')
      assert.equal(summary.largestPositive.id, 'Q3')
    })
  })

  describe('summary', () => {
    it('names the lowest and highest mastery dimension and the spread between them', () => {
      const { summary } = paper
      assert.equal(summary.lowestDimension.name, 'Comprehend')
      assert.equal(summary.highestDimension.name, 'Recall')
      assert.ok(closeTo(summary.dimensionSpreadPp, summary.highestDimension.meanPct - summary.lowestDimension.meanPct))
    })
  })

  it('contains no generated narrative text', () => {
    assert.ok(!('insights' in paper))
    assert.ok(!('insights' in paper.summary))
  })
})

describe('analyzePaper: item analysis and reliability', () => {
  let paper
  before(async () => {
    ;({ paper } = await loadAnalysis())
  })

  it('adds attempt rate and item statistics to each question row', () => {
    const q2 = paper.questions.rows.find((r) => r.id === 'Q2')
    assert.ok(closeTo(q2.attemptRatePct, 66.67))
    for (const key of ['discriminationIndex', 'itemRestCorrelation', 'alphaIfRemoved']) assert.ok(key in q2, key)
    assert.equal(q2.discriminationIndex, 1)
  })

  it('reports exam reliability', () => {
    assert.ok('alpha' in paper.reliability && 'sem' in paper.reliability)
    assert.equal(paper.reliability.itemCount, 3)
  })
})

describe('analyzePaper: marks share', () => {
  let paper
  before(async () => {
    ;({ paper } = await loadAnalysis())
  })

  it('reports each dimension’s share of the exam’s marks', () => {
    const share = Object.fromEntries(paper.dimensions.map((d) => [d.dimension, d.shareOfExamPct]))
    assert.deepEqual(share, { Recall: 25, Comprehend: 12.5, Solve: 62.5 })
  })
})

describe('analyzePaper: top and bottom quartile profiles', () => {
  let paper
  before(async () => {
    ;({ paper } = await loadAnalysis())
  })

  it('compares the top and bottom quarter of students (at least one each) by dimension', () => {
    const { quartiles } = paper
    assert.equal(quartiles.groupSize, 1)
    const recall = quartiles.dimensions.find((d) => d.dimension === 'Recall')
    assert.deepEqual([recall.topMeanPct, recall.bottomMeanPct, recall.separationPp], [100, 0, 100])
    assert.equal(quartiles.difficulties.length, 3)
  })

  it('sizes the groups at a quarter of the cohort', async () => {
    const dataset = await loadDataset()
    const students = Array.from({ length: 8 }, (_, i) => ({
      id: `X${i}`, name: `X${i}`, scores: { Q1: i % 3, Q2: i % 5, Q3: i },
    }))
    const { paper: big } = await (async () => {
      const { buildProfiles } = await import('../src/lib/profiles.js')
      const { analyzePaper } = await import('../src/lib/paper.js')
      const d = { ...dataset, students }
      return { paper: analyzePaper(d, buildProfiles(d)) }
    })()
    assert.equal(big.quartiles.groupSize, 2)
  })
})
