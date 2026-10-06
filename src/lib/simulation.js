import { DIMENSIONS } from './constants.js'
import { resolveExpectedSolveRate } from './expected.js'
import { round, describe, decileBins, markBins } from './stats.js'

// Monte Carlo model of a cohort whose performance matches the instructor's
// expected solve rates. Every modelling choice is a parameter.
//
// Each synthetic student has an ability theta ~ Normal(abilityMean, abilitySd).
//
//  * Partial-credit questions: the student earns full marks with probability
//    pFull = clamp(expectedRate + partialAbilityEffect * (theta - abilityMean), 0, 1).
//    Otherwise each of `testCases` test cases passes independently with
//    probability sqrt(pFull) and marks are proportional to cases passed.
//    A question is partial credit when `partialCredit` is 'all', or 'auto' and
//    some student's actual score is strictly between 0 and the question's marks.
//  * All other questions: a logistic item model
//      p = g + (1 - g) / (1 + exp(-discrimination * (theta - b)))
//    where g = guessing for questions with an answer key (correct_option) and
//    0 otherwise. The item location b is solved so that a student of mean
//    ability succeeds with probability exactly equal to the question's expected
//    solve rate. Full marks or none.

export const DEFAULT_SIM_PARAMS = {
  cohortSize: 1000,
  seed: 12345,
  runs: 50,
  abilityMean: 0,
  abilitySd: 1,
  discrimination: 1.4,
  guessing: 0.2,
  partialCredit: 'auto',
  testCases: 5,
  partialAbilityEffect: 0.15,
  minExpectedRatePct: 5,
  maxExpectedRatePct: 95,
}

const MAX_WORK = 2_000_000
const PARTIAL_MODES = ['auto', 'all', 'none']
const EPSILON = 1e-9

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v)

// Returns { params, errors }. Unspecified parameters take their defaults.
export function validateSimParams(input = {}) {
  const params = { ...DEFAULT_SIM_PARAMS, ...input }
  const errors = []
  const check = (key, ok, message) => {
    if (!ok) errors.push(`${key}: ${message}`)
  }

  check('cohortSize', Number.isInteger(params.cohortSize) && params.cohortSize >= 1 && params.cohortSize <= 100000, 'must be a whole number from 1 to 100000')
  check('runs', Number.isInteger(params.runs) && params.runs >= 1 && params.runs <= 500, 'must be a whole number from 1 to 500')
  check(
    'runs',
    !Number.isInteger(params.runs) || !Number.isInteger(params.cohortSize) || params.runs * params.cohortSize <= MAX_WORK,
    `cohortSize x runs must not exceed ${MAX_WORK.toLocaleString('en')}`
  )
  check('partialCredit', PARTIAL_MODES.includes(params.partialCredit), `must be one of: ${PARTIAL_MODES.join(', ')}`)
  check('seed', Number.isInteger(params.seed), 'must be a whole number')
  check('abilityMean', isNumber(params.abilityMean), 'must be a number')
  check('abilitySd', isNumber(params.abilitySd) && params.abilitySd >= 0, 'must be a number, 0 or greater')
  check('discrimination', isNumber(params.discrimination) && params.discrimination > 0, 'must be a number greater than 0')
  check('guessing', isNumber(params.guessing) && params.guessing >= 0 && params.guessing < 1, 'must be at least 0 and less than 1')
  check('testCases', Number.isInteger(params.testCases) && params.testCases >= 1, 'must be a whole number, 1 or greater')
  check('partialAbilityEffect', isNumber(params.partialAbilityEffect), 'must be a number')
  check('minExpectedRatePct', isNumber(params.minExpectedRatePct) && params.minExpectedRatePct >= 0, 'must be a number, 0 or greater')
  check('maxExpectedRatePct', isNumber(params.maxExpectedRatePct) && params.maxExpectedRatePct <= 100, 'must be a number, 100 or less')
  check(
    'minExpectedRatePct',
    !isNumber(params.minExpectedRatePct) || !isNumber(params.maxExpectedRatePct) || params.minExpectedRatePct < params.maxExpectedRatePct,
    'must be less than maxExpectedRatePct'
  )

  return { params, errors }
}

function mulberry32(seed) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Ids of questions where some student's actual score is strictly between 0 and the marks.
function observedPartialCredit(dataset) {
  const found = new Set()
  for (const q of dataset.questions) {
    if (dataset.students.some((s) => q.id in s.scores && s.scores[q.id] > EPSILON && s.scores[q.id] < q.marks - EPSILON)) {
      found.add(q.id)
    }
  }
  return found
}

function prepareQuestion(q, params, partialIds) {
  const { ratePct } = resolveExpectedSolveRate(q)
  const rate = clamp(ratePct, params.minExpectedRatePct, params.maxExpectedRatePct) / 100

  const partial = params.partialCredit === 'all' || (params.partialCredit === 'auto' && partialIds.has(q.id))
  if (partial) return { q, mode: 'partial', rate }

  const g = q.correctOption ? params.guessing : 0
  const s = clamp((rate - g) / (1 - g), 0.01, 0.99)
  const location = params.abilityMean - Math.log(s / (1 - s)) / params.discrimination
  return { q, mode: 'full', g, location }
}

// dataset: { questions, students } (students are used only for their count if
// cohortSize is not given). Throws if the parameters are invalid.
export function simulateCohort(dataset, rawParams = {}) {
  const { params, errors } = validateSimParams(rawParams)
  if (errors.length) throw new Error(`Invalid simulation parameters: ${errors.join('; ')}`)

  const { questions } = dataset
  const rand = mulberry32(params.seed)
  const normal = () => {
    const u1 = Math.max(rand(), 1e-12)
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rand())
  }

  const partialIds = params.partialCredit === 'auto' ? observedPartialCredit(dataset) : new Set()
  const prepared = questions.map((q) => prepareQuestion(q, params, partialIds))
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0)

  const groups = { dimensions: {}, topics: {} }
  const available = { dimensions: {}, topics: {} }
  for (const q of questions) {
    for (const group of ['dimensions', 'topics']) {
      for (const name of q[group]) {
        available[group][name] = (available[group][name] ?? 0) + q.marks / q[group].length
        groups[group][name] = 0
      }
    }
  }

  const synthetic = []
  for (let i = 0; i < params.cohortSize; i++) {
    const theta = params.abilityMean + params.abilitySd * normal()
    let earned = 0

    for (const item of prepared) {
      const { q } = item
      let score
      if (item.mode === 'partial') {
        const pFull = clamp(item.rate + params.partialAbilityEffect * (theta - params.abilityMean), 0, 1)
        if (rand() < pFull) {
          score = q.marks
        } else {
          const pCase = Math.sqrt(pFull)
          let passed = 0
          for (let t = 0; t < params.testCases; t++) if (rand() < pCase) passed++
          score = round((passed / params.testCases) * q.marks)
        }
      } else {
        const p = item.g + (1 - item.g) / (1 + Math.exp(-params.discrimination * (theta - item.location)))
        score = rand() < p ? q.marks : 0
      }
      earned += score
      for (const group of ['dimensions', 'topics']) {
        for (const name of q[group]) groups[group][name] += score / q[group].length
      }
    }
    synthetic.push({ id: `synthetic-${i + 1}`, earned })
  }

  const items = synthetic.map((s) => ({ id: s.id, earned: s.earned, pct: totalMarks > 0 ? (s.earned / totalMarks) * 100 : null }))

  const summarize = (group, order) =>
    Object.fromEntries(
      order
        .filter((name) => name in available[group])
        .map((name) => {
          const expectedEarned = groups[group][name] / params.cohortSize
          return [
            name,
            {
              availableMarks: round(available[group][name]),
              expectedEarned: round(expectedEarned),
              expectedMasteryPct: round((expectedEarned / available[group][name]) * 100),
            },
          ]
        })
    )

  return {
    params,
    studentCount: params.cohortSize,
    totalMarks: round(totalMarks),
    questions: prepared.map((p) => ({ id: p.q.id, mode: p.mode === 'partial' ? 'partial' : 'full', guessing: p.mode === 'full' ? p.g : 0 })),
    modes: {
      partialCredit: prepared.filter((p) => p.mode === 'partial').length,
      guessing: prepared.filter((p) => p.mode === 'full' && p.g > 0).length,
      standard: prepared.filter((p) => p.mode === 'full' && p.g === 0).length,
    },
    pct: describe(items.map((i) => i.pct)),
    earned: describe(items.map((i) => i.earned)),
    decileBins: decileBins(items),
    markBins: markBins(items, totalMarks),
    dimensions: summarize('dimensions', DIMENSIONS),
    topics: summarize('topics', Object.keys(available.topics).sort((a, b) => a.localeCompare(b))),
  }
}

const percentile = (sorted, p) => {
  const position = p * (sorted.length - 1)
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
}

// 90% range (5th to 95th percentile) and mean of a list of values.
function range(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return {
    meanPct: round(values.reduce((a, b) => a + b, 0) / values.length),
    lowPct: round(percentile(sorted, 0.05)),
    highPct: round(percentile(sorted, 0.95)),
  }
}

// The run for params.seed, plus the 90% range of key results over params.runs
// runs (seeds seed, seed + 1, ...). Throws on invalid parameters.
export function simulateMany(dataset, rawParams = {}) {
  const { params, errors } = validateSimParams(rawParams)
  if (errors.length) throw new Error(`Invalid simulation parameters: ${errors.join('; ')}`)
  const first = simulateCohort(dataset, params)
  const results = [first]
  for (let i = 1; i < params.runs; i++) results.push(simulateCohort(dataset, { ...params, seed: params.seed + i }))

  const stat = (key) => range(results.map((r) => r.pct[key]))
  return {
    ...first,
    bands: {
      runs: params.runs,
      mean: stat('mean'),
      median: stat('median'),
      stdDev: stat('stdDev'),
      decileBins: first.decileBins.map((bin, i) => ({ label: bin.label, ...range(results.map((r) => r.decileBins[i].percentage)) })),
      dimensions: Object.fromEntries(
        Object.keys(first.dimensions).map((d) => [d, range(results.map((r) => r.dimensions[d].expectedMasteryPct))])
      ),
    },
  }
}

// Adds lowPct / highPct / withinRange to a row when a range is available.
const withRange = (row, actual, band) =>
  band ? { ...row, lowPct: band.lowPct, highPct: band.highPct, withinRange: actual != null && actual >= band.lowPct && actual <= band.highPct } : row

// Gaps are always actual minus expected, in percentage points. If the
// simulation came from simulateMany, rows also carry the 90% range.
export function compareToActual(simulation, profiles, paper) {
  const bands = simulation.bands ?? null
  const gap = (actual, expected) => (actual == null || expected == null ? null : round(actual - expected))
  const stat = (key) =>
    withRange(
      { expectedPct: simulation.pct[key], actualPct: paper.overall.pct[key], gapPp: gap(paper.overall.pct[key], simulation.pct[key]) },
      paper.overall.pct[key],
      bands?.[key]
    )
  const binRows = (expectedBins, actualBins, bandBins = null) =>
    expectedBins.map((expected, i) => {
      const actual = actualBins[i]
      const actualPct = actual?.percentage ?? 0
      return withRange(
        {
          label: expected.label,
          expectedCount: expected.count,
          expectedPct: expected.percentage,
          actualCount: actual?.count ?? 0,
          actualPct,
          deltaPp: round(actualPct - expected.percentage),
        },
        actualPct,
        bandBins?.[i]
      )
    })

  const deciles = binRows(simulation.decileBins, paper.overall.decileBins, bands?.decileBins)

  const gapRows = (expectedGroup, actualGroup, key, bandGroup = null) =>
    Object.entries(expectedGroup).map(([name, e]) => {
      const actualMasteryPct = actualGroup[name]?.masteryPct ?? null
      return withRange(
        {
          [key]: name,
          availableMarks: e.availableMarks,
          expectedMasteryPct: e.expectedMasteryPct,
          actualMasteryPct,
          gapPp: gap(actualMasteryPct, e.expectedMasteryPct),
        },
        actualMasteryPct,
        bandGroup?.[name]
      )
    })

  return {
    mean: stat('mean'),
    median: stat('median'),
    stdDev: stat('stdDev'),
    distributionDistancePct: round(deciles.reduce((sum, b) => sum + Math.abs(b.deltaPp), 0) / 2),
    decileBins: deciles,
    markBins: binRows(simulation.markBins, paper.overall.markBins),
    dimensions: gapRows(simulation.dimensions, profiles.cohort.dimensions, 'dimension', bands?.dimensions),
    topics: gapRows(simulation.topics, profiles.cohort.topics, 'topic'),
  }
}
