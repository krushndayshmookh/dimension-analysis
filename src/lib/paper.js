import { round, describe, decileBins, markBins } from './stats.js'
import { resolveExpectedSolveRate } from './expected.js'

const EPSILON = 1e-9

const distribution = (items, totalMarks) => ({
  pct: describe(items.map((i) => i.pct)),
  earned: describe(items.map((i) => i.earned)),
  decileBins: decileBins(items),
  markBins: markBins(items, totalMarks),
})

function analyzeQuestions(dataset) {
  const { questions, students } = dataset
  const n = students.length

  const rows = questions.map((q) => {
    let attemptedCount = 0
    let solvedCount = 0
    let totalEarned = 0
    for (const s of students) {
      if (!(q.id in s.scores)) continue
      attemptedCount++
      totalEarned += s.scores[q.id]
      if (s.scores[q.id] >= q.marks - EPSILON) solvedCount++
    }
    const { ratePct, source } = resolveExpectedSolveRate(q)
    const solveRatePct = n ? (solvedCount / n) * 100 : null
    const meanEarned = n ? totalEarned / n : null
    return {
      id: q.id,
      type: q.type,
      difficulty: q.difficulty,
      dimensions: q.dimensions,
      topics: q.topics,
      marks: q.marks,
      studentCount: n,
      attemptedCount,
      solvedCount,
      solveRatePct: solveRatePct == null ? null : round(solveRatePct),
      attemptedSolveRatePct: attemptedCount ? round((solvedCount / attemptedCount) * 100) : null,
      meanEarned: meanEarned == null ? null : round(meanEarned),
      meanScorePct: meanEarned == null ? null : round((meanEarned / q.marks) * 100),
      expectedSolveRatePct: ratePct,
      expectedSource: source,
      deviationPct: solveRatePct == null ? null : round(solveRatePct - ratePct),
    }
  })

  const withDeviation = rows.filter((r) => r.deviationPct != null)
  const extreme = (pick) =>
    withDeviation.length
      ? withDeviation.reduce((best, r) => (pick(r.deviationPct, best.deviationPct) ? r : best))
      : null
  const brief = (r) => (r ? { id: r.id, deviationPct: r.deviationPct } : null)

  return {
    rows,
    summary: {
      questionCount: rows.length,
      meanAbsDeviationPct: withDeviation.length
        ? round(withDeviation.reduce((sum, r) => sum + Math.abs(r.deviationPct), 0) / withDeviation.length)
        : null,
      largestNegative: brief(extreme((a, b) => a < b)),
      largestPositive: brief(extreme((a, b) => a > b)),
    },
  }
}

function analyzeMatrix(dataset, profiles) {
  const { questions, students } = dataset
  const n = students.length
  const { dimensions, difficulties } = profiles

  const blank = () => ({ questionIds: [], availableMarks: 0, earnedSum: 0 })
  const cells = Object.fromEntries(dimensions.map((d) => [d, Object.fromEntries(difficulties.map((t) => [t, blank()]))]))
  const rows = Object.fromEntries(dimensions.map((d) => [d, blank()]))
  const cols = Object.fromEntries(difficulties.map((t) => [t, blank()]))
  const grand = blank()

  const add = (target, q, share, earnedSum) => {
    target.questionIds.push(q.id)
    target.availableMarks += share
    target.earnedSum += earnedSum
  }

  for (const q of questions) {
    const earnedAll = students.reduce((sum, s) => sum + (s.scores[q.id] ?? 0), 0)
    const share = q.marks / q.dimensions.length
    for (const d of q.dimensions) {
      add(cells[d][q.difficulty], q, share, earnedAll / q.dimensions.length)
      add(rows[d], q, share, earnedAll / q.dimensions.length)
    }
    add(cols[q.difficulty], q, q.marks, earnedAll)
    add(grand, q, q.marks, earnedAll)
  }

  const finish = (c) => {
    const meanEarned = n ? c.earnedSum / n : 0
    return {
      questionCount: c.questionIds.length,
      questionIds: c.questionIds,
      availableMarks: round(c.availableMarks),
      meanEarned: round(meanEarned),
      masteryPct: c.availableMarks > 0 && n ? round((meanEarned / c.availableMarks) * 100) : null,
    }
  }
  const mapValues = (obj, fn) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v)]))

  return {
    dimensions,
    difficulties,
    cells: mapValues(cells, (row) => mapValues(row, finish)),
    rowTotals: mapValues(rows, finish),
    colTotals: mapValues(cols, finish),
    grandTotal: finish(grand),
  }
}

// dataset and profiles come from the same upload (profiles = buildProfiles(dataset)).
export function analyzePaper(dataset, profiles) {
  const { questions } = dataset
  const { students, totalMarks } = profiles
  const itemsFor = (pick) => students.map((s) => ({ id: s.id, ...pick(s) }))

  const overall = {
    studentCount: students.length,
    totalMarks,
    ...distribution(itemsFor((s) => ({ pct: s.masteryPct, earned: s.earned })), totalMarks),
  }

  const dimensions = profiles.dimensions.map((dimension) => {
    const matching = questions.filter((q) => q.dimensions.includes(dimension))
    const availableMarks = profiles.cohort.dimensions[dimension].availableExam
    return {
      dimension,
      questionCount: matching.length,
      availableMarks,
      ...distribution(
        itemsFor((s) => ({ pct: s.dimensions[dimension].masteryPct, earned: s.dimensions[dimension].earned })),
        availableMarks
      ),
    }
  })

  const difficulties = profiles.difficulties.map((difficulty) => {
    const availableMarks = profiles.cohort.difficulties[difficulty].availableExam
    const items = itemsFor((s) => ({ pct: s.difficulties[difficulty].masteryPct, earned: s.difficulties[difficulty].earned }))
    return {
      difficulty,
      questionCount: questions.filter((q) => q.difficulty === difficulty).length,
      availableMarks,
      shareOfExamPct: totalMarks > 0 ? round((availableMarks / totalMarks) * 100) : null,
      pct: describe(items.map((i) => i.pct)),
      earned: describe(items.map((i) => i.earned)),
    }
  })

  const topics = profiles.topics.map((topic) => {
    const c = profiles.cohort.topics[topic]
    return {
      topic,
      questionCount: questions.filter((q) => q.topics.includes(topic)).length,
      availableMarks: c.availableExam,
      meanEarned: c.earned,
      masteryPct: c.masteryPct,
    }
  })

  const ranked = dimensions.filter((d) => d.pct.mean != null)
  const lowest = ranked.length ? ranked.reduce((a, b) => (b.pct.mean < a.pct.mean ? b : a)) : null
  const highest = ranked.length ? ranked.reduce((a, b) => (b.pct.mean > a.pct.mean ? b : a)) : null
  const named = (d) => (d ? { name: d.dimension, meanPct: d.pct.mean } : null)

  const lowestTier = difficulties.filter((d) => d.pct.mean != null)
  const lowestDifficulty = lowestTier.length ? lowestTier.reduce((a, b) => (b.pct.mean < a.pct.mean ? b : a)) : null

  return {
    overall,
    dimensions,
    difficulties,
    topics,
    matrix: analyzeMatrix(dataset, profiles),
    questions: analyzeQuestions(dataset),
    summary: {
      lowestDimension: named(lowest),
      highestDimension: named(highest),
      dimensionSpreadPp: lowest && highest ? round(highest.pct.mean - lowest.pct.mean) : null,
      lowestDifficulty: lowestDifficulty
        ? { name: lowestDifficulty.difficulty, meanPct: lowestDifficulty.pct.mean, availableMarks: lowestDifficulty.availableMarks, questionCount: lowestDifficulty.questionCount }
        : null,
    },
  }
}
