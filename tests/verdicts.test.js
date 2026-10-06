import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_SETTINGS as S, setPath } from '../src/lib/settings.js'
import {
  masteryVerdict,
  studentLevel,
  deviationVerdict,
  difficultyVerdict,
  attainmentRates,
  tierProgression,
  gapVerdict,
  spreadVerdict,
  questionFlags,
  discriminationVerdict,
  reliabilityVerdict,
  trendVerdict,
  blueprintVerdict,
  attentionReasons,
  sectionSizeVerdict,
  differenceVerdict,
} from '../src/lib/verdicts.js'

const level = (v) => v?.level
const tone = (v) => v?.tone

describe('masteryVerdict', () => {
  it('is weak below the weak threshold, strong from the strong threshold, average between', () => {
    assert.deepEqual(masteryVerdict(49.99, S), { level: 'weak', label: 'Weak', tone: 'bad' })
    assert.equal(level(masteryVerdict(50, S)), 'average')
    assert.deepEqual(masteryVerdict(79.99, S), { level: 'average', label: 'Average', tone: 'neutral' })
    assert.deepEqual(masteryVerdict(80, S), { level: 'strong', label: 'Strong', tone: 'good' })
  })

  it('has no verdict for a missing value', () => {
    assert.equal(masteryVerdict(null, S), null)
    assert.equal(masteryVerdict(undefined, S), null)
  })

  it('follows the configured thresholds', () => {
    const custom = setPath(setPath(S, 'mastery.weakBelow', 60), 'mastery.strongFrom', 90)
    assert.equal(level(masteryVerdict(55, custom)), 'weak')
    assert.equal(level(masteryVerdict(85, custom)), 'average')
  })
})

describe('studentLevel', () => {
  it('uses absolute thresholds only while the cohort margin is off', () => {
    assert.equal(level(studentLevel(40, 30, S)), 'weak')
    assert.equal(level(studentLevel(85, 82, S)), 'strong')
  })

  it('also needs to be a margin below/above the cohort when the margin is on', () => {
    const on = setPath(S, 'cohortMargin.enabled', true)
    assert.equal(level(studentLevel(40, 45, on)), 'average', 'below 50 but only 5 below cohort')
    assert.equal(level(studentLevel(40, 60, on)), 'weak')
    assert.equal(level(studentLevel(85, 80, on)), 'average')
    assert.equal(level(studentLevel(95, 70, on)), 'strong')
  })

  it('falls back to absolute thresholds when there is no cohort value', () => {
    const on = setPath(S, 'cohortMargin.enabled', true)
    assert.equal(level(studentLevel(40, null, on)), 'weak')
  })
})

describe('deviationVerdict', () => {
  it('is low, medium or high by absolute deviation with green, yellow, red tones', () => {
    assert.deepEqual(
      [9.99, 10, 19.99, 20, 35].map((d) => level(deviationVerdict(d, S))),
      ['low', 'medium', 'medium', 'high', 'high']
    )
    assert.deepEqual(
      ['low', 'medium', 'high'].map((l) => tone({ ...deviationVerdict(l === 'low' ? 1 : l === 'medium' ? 12 : 30, S) })),
      ['good', 'warn', 'bad']
    )
  })

  it('treats negative deviations the same and reports direction', () => {
    assert.equal(level(deviationVerdict(-25, S)), 'high')
    assert.equal(deviationVerdict(-25, S).direction, 'harder')
    assert.equal(deviationVerdict(25, S).direction, 'easier')
    assert.equal(deviationVerdict(0, S).direction, null)
  })

  it('labels the levels Low, Medium and High', () => {
    assert.deepEqual([3, 12, 30].map((d) => deviationVerdict(d, S).label), ['Low', 'Medium', 'High'])
  })

  it('has no verdict for a missing deviation', () => {
    assert.equal(deviationVerdict(null, S), null)
  })
})

describe('difficultyVerdict', () => {
  it('bands the cohort mean', () => {
    const labels = [39.9, 40, 54.9, 55, 69.9, 70, 84.9, 85].map((p) => difficultyVerdict(p, S).label)
    assert.deepEqual(labels, [
      'Very difficult', 'Difficult', 'Difficult', 'Balanced', 'Balanced', 'Easy', 'Easy', 'Very easy',
    ])
  })

  it('tones: bad, warn, good, info, info', () => {
    assert.deepEqual([30, 50, 60, 75, 95].map((p) => difficultyVerdict(p, S).tone), ['bad', 'warn', 'good', 'info', 'info'])
  })

  it('has no verdict for a missing mean', () => {
    assert.equal(difficultyVerdict(null, S), null)
  })
})

describe('attainmentRates', () => {
  it('counts students at or above the pass and distinction marks', () => {
    const r = attainmentRates([100, 75, 74.9, 50, 49.9, 0], S)
    assert.deepEqual(r.pass, { count: 4, ratePct: 66.67 })
    assert.deepEqual(r.distinction, { count: 2, ratePct: 33.33 })
    assert.equal(r.studentCount, 6)
  })

  it('returns null rates for no students', () => {
    assert.equal(attainmentRates([], S).pass.ratePct, null)
  })
})

describe('tierProgression', () => {
  const tiers = [
    { difficulty: 'easy', availableMarks: 10, pct: { mean: 80 } },
    { difficulty: 'medium', availableMarks: 0, pct: { mean: null } },
    { difficulty: 'hard', availableMarks: 10, pct: { mean: 83 } },
    { difficulty: 'challenge', availableMarks: 5, pct: { mean: 30 } },
  ]

  it('compares each tier with the previous tier that has questions', () => {
    const rows = tierProgression(tiers, S)
    assert.equal(rows.length, 2)
    assert.deepEqual([rows[0].easier, rows[0].harder, rows[0].changePp], ['easy', 'hard', 3])
    assert.equal(rows[0].inverted, true, '3 pp is above the 2 pp tolerance')
    assert.equal(rows[1].inverted, false)
  })

  it('does not flag a rise within the tolerance', () => {
    const tolerant = setPath(S, 'tiers.inversionTolerancePp', 5)
    assert.equal(tierProgression(tiers, tolerant)[0].inverted, false)
  })
})

describe('gapVerdict (simulation)', () => {
  it('bands the absolute gap and reports direction', () => {
    assert.deepEqual([2, 5, 14.9, 15, -20].map((g) => gapVerdict(g, S).level), ['aligned', 'moderate', 'moderate', 'large', 'large'])
    assert.equal(gapVerdict(-20, S).direction, 'below')
    assert.equal(gapVerdict(20, S).direction, 'above')
    assert.equal(gapVerdict(null, S), null)
  })
})

describe('spreadVerdict', () => {
  it('bands the spread between the highest and lowest dimension', () => {
    assert.deepEqual([10, 15, 29.9, 30].map((x) => spreadVerdict(x, S).level), ['balanced', 'moderate', 'moderate', 'high'])
    assert.equal(spreadVerdict(null, S), null)
  })
})

describe('questionFlags', () => {
  const row = (over) => ({ solveRatePct: 60, attemptRatePct: 95, discriminationIndex: 0.4, ...over })
  const ids = (r) => questionFlags(r, S).map((f) => f.id)

  it('has no flags for an unremarkable question', () => {
    assert.deepEqual(ids(row()), [])
  })

  it('flags too easy, too hard, many skipped and negative discrimination', () => {
    assert.deepEqual(ids(row({ solveRatePct: 90 })), ['too-easy'])
    assert.deepEqual(ids(row({ solveRatePct: 19.9 })), ['too-hard'])
    assert.deepEqual(ids(row({ attemptRatePct: 69.9 })), ['low-attempt'])
    assert.deepEqual(ids(row({ discriminationIndex: -0.1 })), ['negative-discrimination'])
  })

  it('skips checks whose inputs are missing', () => {
    assert.deepEqual(ids({ solveRatePct: null, attemptRatePct: null, discriminationIndex: null }), [])
  })

  it('gives each flag a label and tone', () => {
    const [flag] = questionFlags(row({ solveRatePct: 95 }), S)
    assert.deepEqual([flag.label, flag.tone], ['Too easy', 'info'])
  })
})

describe('discriminationVerdict', () => {
  it('is negative, poor, fair or good', () => {
    assert.deepEqual(
      [-0.2, 0, 0.19, 0.2, 0.29, 0.3, 0.8].map((d) => discriminationVerdict(d, S).level),
      ['negative', 'poor', 'poor', 'fair', 'fair', 'good', 'good']
    )
    assert.deepEqual([-0.2, 0.1, 0.25, 0.5].map((d) => discriminationVerdict(d, S).tone), ['bad', 'bad', 'warn', 'good'])
    assert.equal(discriminationVerdict(null, S), null)
  })
})

describe('reliabilityVerdict', () => {
  it('is acceptable from the configured alpha', () => {
    assert.equal(reliabilityVerdict(0.7, S).label, 'Acceptable')
    assert.equal(reliabilityVerdict(0.69, S).label, 'Low')
    assert.equal(reliabilityVerdict(null, S), null)
  })
})

describe('trendVerdict', () => {
  it('is a gain, a drop or steady relative to the notable-change threshold', () => {
    assert.deepEqual([12, 10, 9.9, -9.9, -10, -15].map((d) => trendVerdict(d, S).level), ['gain', 'gain', 'steady', 'steady', 'drop', 'drop'])
    assert.deepEqual([15, 0, -15].map((d) => trendVerdict(d, S).tone), ['good', 'neutral', 'bad'])
    assert.equal(trendVerdict(null, S), null)
  })
})

describe('blueprintVerdict', () => {
  it('has no verdict without a target', () => {
    assert.equal(blueprintVerdict(30, null, S), null)
  })

  it('is on target within the tolerance, otherwise over or under', () => {
    assert.equal(blueprintVerdict(24, 20, S).level, 'on-target')
    assert.equal(blueprintVerdict(25, 20, S).level, 'on-target')
    assert.equal(blueprintVerdict(25.1, 20, S).level, 'over')
    assert.equal(blueprintVerdict(10, 20, S).level, 'under')
  })
})

describe('attentionReasons', () => {
  const cohort = { dimensions: { Recall: { masteryPct: 60 }, Solve: { masteryPct: 60 }, Build: { masteryPct: 60 } } }
  const student = (pct, dims) => ({
    masteryPct: pct,
    dimensions: Object.fromEntries(Object.entries(dims).map(([d, p]) => [d, { masteryPct: p }])),
  })
  const ids = (st) => attentionReasons(st, cohort, S).map((r) => r.id)

  it('needs no attention when above the pass mark with at most one weak dimension', () => {
    assert.deepEqual(ids(student(70, { Recall: 80, Solve: 70, Build: 40 })), [])
  })

  it('flags below the pass mark', () => {
    assert.deepEqual(ids(student(45, { Recall: 60, Solve: 60, Build: 60 })), ['below-pass'])
  })

  it('flags near the pass mark (pass mark up to pass mark + margin)', () => {
    assert.deepEqual(ids(student(50, { Recall: 60, Solve: 60, Build: 60 })), ['near-pass'])
    assert.deepEqual(ids(student(54.9, { Recall: 60, Solve: 60, Build: 60 })), ['near-pass'])
    assert.deepEqual(ids(student(55, { Recall: 60, Solve: 60, Build: 60 })), [])
  })

  it('flags weakness in several dimensions', () => {
    assert.deepEqual(ids(student(70, { Recall: 30, Solve: 40, Build: 90 })), ['weak-dimensions'])
  })

  it('can report several reasons, each with a label and tone', () => {
    const reasons = attentionReasons(student(40, { Recall: 30, Solve: 40, Build: 90 }), cohort, S)
    assert.deepEqual(reasons.map((r) => r.id), ['below-pass', 'weak-dimensions'])
    assert.deepEqual(reasons.map((r) => r.tone), ['bad', 'warn'])
    assert.equal(reasons[1].label, 'Weak in 2 dimensions')
  })
})

describe('sectionSizeVerdict', () => {
  it('flags sections smaller than the configured size', () => {
    assert.deepEqual(sectionSizeVerdict(4, S), { level: 'small', label: 'Small section', tone: 'warn' })
    assert.equal(sectionSizeVerdict(5, S), null)
    assert.equal(sectionSizeVerdict(12, setPath(S, 'sections.minSize', 20)).level, 'small')
  })
})

describe('differenceVerdict', () => {
  it('is significant below the configured significance level', () => {
    assert.deepEqual(differenceVerdict(0.049, S), { level: 'significant', label: 'Significant', tone: 'info' })
    assert.equal(differenceVerdict(0.05, S).label, 'Not significant')
    assert.equal(differenceVerdict(0.04, setPath(S, 'sections.significance', 0.01)).level, 'not-significant')
    assert.equal(differenceVerdict(null, S), null)
  })
})
