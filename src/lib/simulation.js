import { DIMENSIONS } from './constants.js'
import { resolveExpectedSolveRate } from './expected.js'
import { round, describe, decileBins, markBins } from './stats.js'

// Monte Carlo model of a cohort whose performance matches the instructor's
// expected solve rates. Every modelling choice is a parameter.
//
// Each synthetic student has an ability theta ~ Normal(abilityMean, abilitySd).
//
//  * Partial-credit types: the student earns full marks with probability
//    pFull = clamp(expectedRate + partialAbilityEffect * (theta - abilityMean), 0, 1).
//    Otherwise each of `testCases` test cases passes independently with
//    probability sqrt(pFull) and marks are proportional to cases passed.
//  * All other types: a logistic item model
//      p = g + (1 - g) / (1 + exp(-discrimination * (theta - b)))
//    where g = guessing for guessingTypes and 0 otherwise. The item location b
//    is solved so that a student of mean ability succeeds with probability
//    exactly equal to the question's expected solve rate. Full marks or none.

export const DEFAULT_SIM_PARAMS = {
  cohortSize: 1000,
  seed: 12345,
  abilityMean: 0,
  abilitySd: 1,
  discrimination: 1.4,
  guessing: 0.2,
  guessingTypes: ['MCQ'],
  partialCreditTypes: ['Coding', 'Code'],
  testCases: 5,
  partialAbilityEffect: 0.15,
  minExpectedRatePct: 5,
  maxExpectedRatePct: 95,
}

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
  for (const key of ['guessingTypes', 'partialCreditTypes']) {
    check(key, Array.isArray(params[key]) && params[key].every((t) => typeof t === 'string'), 'must be a list of question types')
  }

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

const typeSet = (list) => new Set(list.map((t) => t.trim().toLowerCase()))

function prepareQuestion(q, params, partialTypes, guessTypes) {
  const { ratePct } = resolveExpectedSolveRate(q)
  const rate = clamp(ratePct, params.minExpectedRatePct, params.maxExpectedRatePct) / 100
  const type = q.type.trim().toLowerCase()

  if (partialTypes.has(type)) return { q, mode: 'partial', rate }

  const g = guessTypes.has(type) ? params.guessing : 0
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

  const partialTypes = typeSet(params.partialCreditTypes)
  const guessTypes = typeSet(params.guessingTypes)
  const prepared = questions.map((q) => prepareQuestion(q, params, partialTypes, guessTypes))
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
    pct: describe(items.map((i) => i.pct)),
    earned: describe(items.map((i) => i.earned)),
    decileBins: decileBins(items),
    markBins: markBins(items, totalMarks),
    dimensions: summarize('dimensions', DIMENSIONS),
    topics: summarize('topics', Object.keys(available.topics).sort((a, b) => a.localeCompare(b))),
  }
}

// Gaps are always actual minus expected, in percentage points.
export function compareToActual(simulation, profiles, paper) {
  const gap = (actual, expected) => (actual == null || expected == null ? null : round(actual - expected))
  const stat = (key) => ({
    expectedPct: simulation.pct[key],
    actualPct: paper.overall.pct[key],
    gapPp: gap(paper.overall.pct[key], simulation.pct[key]),
  })
  const binRows = (expectedBins, actualBins) =>
    expectedBins.map((expected, i) => {
      const actual = actualBins[i]
      return {
        label: expected.label,
        expectedCount: expected.count,
        expectedPct: expected.percentage,
        actualCount: actual?.count ?? 0,
        actualPct: actual?.percentage ?? 0,
        deltaPp: round((actual?.percentage ?? 0) - expected.percentage),
      }
    })

  const deciles = binRows(simulation.decileBins, paper.overall.decileBins)

  const gapRows = (expectedGroup, actualGroup, key) =>
    Object.entries(expectedGroup).map(([name, e]) => {
      const actualMasteryPct = actualGroup[name]?.masteryPct ?? null
      return {
        [key]: name,
        availableMarks: e.availableMarks,
        expectedMasteryPct: e.expectedMasteryPct,
        actualMasteryPct,
        gapPp: gap(actualMasteryPct, e.expectedMasteryPct),
      }
    })

  return {
    mean: stat('mean'),
    median: stat('median'),
    stdDev: stat('stdDev'),
    distributionDistancePct: round(deciles.reduce((sum, b) => sum + Math.abs(b.deltaPp), 0) / 2),
    decileBins: deciles,
    markBins: binRows(simulation.markBins, paper.overall.markBins),
    dimensions: gapRows(simulation.dimensions, profiles.cohort.dimensions, 'dimension'),
    topics: gapRows(simulation.topics, profiles.cohort.topics, 'topic'),
  }
}
