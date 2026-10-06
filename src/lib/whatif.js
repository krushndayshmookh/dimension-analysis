import { round } from './stats.js'
import { analyzeDataset } from './analysis.js'
import { attainmentRates } from './verdicts.js'

export const ACTIONS = ['none', 'drop', 'full-all', 'full-attempted']

// A rescored copy of the dataset; the original is never changed.
//   drop            the question is removed from the paper
//   full-all        every student gets full marks, including those who left it blank
//   full-attempted  students who attempted it get full marks; blank stays blank
export function applyAdjustments(dataset, adjustments) {
  const known = new Map(dataset.questions.map((q) => [q.id, q]))
  const active = Object.entries(adjustments).filter(([, action]) => action !== 'none')
  for (const [id, action] of active) {
    if (!known.has(id)) throw new Error(`Unknown question ${id}`)
    if (!ACTIONS.includes(action)) throw new Error(`Unknown adjustment "${action}" for ${id}`)
  }
  const dropped = new Set(active.filter(([, a]) => a === 'drop').map(([id]) => id))
  if (dropped.size >= dataset.questions.length) throw new Error('At least one question must remain')

  const questions = dataset.questions.filter((q) => !dropped.has(q.id)).map((q) => ({ ...q }))
  const students = dataset.students.map((s) => {
    const scores = {}
    for (const q of questions) if (q.id in s.scores) scores[q.id] = s.scores[q.id]
    for (const [id, action] of active) {
      const q = known.get(id)
      if (action === 'full-all' || (action === 'full-attempted' && id in s.scores)) scores[id] = q.marks
    }
    return { ...s, scores }
  })
  return { ...dataset, questions, students }
}

const delta = (after, before) => (after == null || before == null ? null : round(after - before))

// base: analyzeDataset(dataset) of the original paper. Returns the analysis of the
// rescored paper and a before/after comparison (pass mark from settings).
export function runScenario(dataset, base, adjustments, settings) {
  const adjustedDataset = applyAdjustments(dataset, adjustments)
  const adjusted = analyzeDataset(adjustedDataset)
  const passMark = settings.attainment.passMark
  const distinctionMark = settings.attainment.distinctionMark

  const baseById = new Map(base.profiles.students.map((s) => [s.id, s]))
  const students = adjusted.profiles.students.map((a) => {
    const b = baseById.get(a.id)
    const crossed = (mark) => (b.masteryPct < mark && a.masteryPct >= mark ? 'gained' : b.masteryPct >= mark && a.masteryPct < mark ? 'lost' : null)
    return {
      id: a.id,
      name: a.name,
      section: a.section,
      baseEarned: b.earned,
      baseTotal: b.totalMarks,
      adjustedEarned: a.earned,
      adjustedTotal: a.totalMarks,
      basePct: b.masteryPct,
      adjustedPct: a.masteryPct,
      deltaPp: delta(a.masteryPct, b.masteryPct),
      baseRank: b.rank,
      adjustedRank: a.rank,
      rankChange: b.rank - a.rank,
      passChange: crossed(passMark),
      distinctionChange: crossed(distinctionMark),
    }
  })

  const pcts = (analysis) => analysis.profiles.students.map((s) => s.masteryPct ?? 0)
  const baseRates = attainmentRates(pcts(base), settings)
  const adjustedRates = attainmentRates(pcts(adjusted), settings)
  const stat = (key) => ({
    basePct: base.paper.overall.pct[key],
    adjustedPct: adjusted.paper.overall.pct[key],
    deltaPp: delta(adjusted.paper.overall.pct[key], base.paper.overall.pct[key]),
  })
  const rate = (b, a) => ({
    baseCount: b.count,
    adjustedCount: a.count,
    deltaCount: a.count - b.count,
    baseRatePct: b.ratePct,
    adjustedRatePct: a.ratePct,
  })

  return {
    adjustedDataset,
    adjusted,
    summary: {
      studentCount: students.length,
      totalMarks: { base: base.profiles.totalMarks, adjusted: adjusted.profiles.totalMarks },
      mean: stat('mean'),
      median: stat('median'),
      stdDev: stat('stdDev'),
      pass: rate(baseRates.pass, adjustedRates.pass),
      distinction: rate(baseRates.distinction, adjustedRates.distinction),
      reliability: {
        baseAlpha: base.paper.reliability.alpha,
        adjustedAlpha: adjusted.paper.reliability.alpha,
        delta: delta(adjusted.paper.reliability.alpha, base.paper.reliability.alpha),
      },
      decileShare: base.paper.overall.decileBins.map((bin, i) => ({
        label: bin.label,
        basePct: bin.percentage,
        adjustedPct: adjusted.paper.overall.decileBins[i].percentage,
      })),
    },
    students,
  }
}
