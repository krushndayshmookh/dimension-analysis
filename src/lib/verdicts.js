import { round } from './stats.js'

// Pure functions turning measured values into tagged verdicts using the
// instructor's settings. A verdict is { level, label, tone } where tone is one
// of 'good' | 'warn' | 'bad' | 'info' | 'neutral' (rendered green, yellow,
// red, blue, grey). A missing value has no verdict (null).

const missing = (v) => v == null || !Number.isFinite(Number(v))
const verdict = (level, label, tone, extra = {}) => ({ level, label, tone, ...extra })

export function masteryVerdict(pct, s) {
  if (missing(pct)) return null
  if (pct < s.mastery.weakBelow) return verdict('weak', 'Weak', 'bad')
  if (pct >= s.mastery.strongFrom) return verdict('strong', 'Strong', 'good')
  return verdict('average', 'Average', 'neutral')
}

// A student's level in a dimension. With the cohort margin enabled, Weak and
// Strong additionally require being that far below / above the cohort.
export function studentLevel(studentPct, cohortPct, s) {
  const absolute = masteryVerdict(studentPct, s)
  if (!absolute || !s.cohortMargin.enabled || missing(cohortPct)) return absolute
  const margin = s.cohortMargin.marginPp
  if (absolute.level === 'weak' && !(studentPct < cohortPct - margin)) return verdict('average', 'Average', 'neutral')
  if (absolute.level === 'strong' && !(studentPct > cohortPct + margin)) return verdict('average', 'Average', 'neutral')
  return absolute
}

// deviationPct = actual - expected solve rate (percentage points).
export function deviationVerdict(deviationPct, s) {
  if (missing(deviationPct)) return null
  const size = Math.abs(deviationPct)
  const direction = deviationPct > 0 ? 'easier' : deviationPct < 0 ? 'harder' : null
  if (size < s.deviation.lowBelow) return verdict('low', 'Low', 'good', { direction })
  if (size < s.deviation.highFrom) return verdict('medium', 'Medium', 'warn', { direction })
  return verdict('high', 'High', 'bad', { direction })
}

export function difficultyVerdict(meanPct, s) {
  if (missing(meanPct)) return null
  const d = s.difficulty
  if (meanPct < d.veryDifficultBelow) return verdict('very-difficult', 'Very difficult', 'bad')
  if (meanPct < d.difficultBelow) return verdict('difficult', 'Difficult', 'warn')
  if (meanPct < d.balancedBelow) return verdict('balanced', 'Balanced', 'good')
  if (meanPct < d.easyBelow) return verdict('easy', 'Easy', 'info')
  return verdict('very-easy', 'Very easy', 'info')
}

export function attainmentRates(masteryPcts, s) {
  const n = masteryPcts.length
  const rate = (limit) => {
    const count = masteryPcts.filter((p) => p >= limit).length
    return { count, ratePct: n ? round((count / n) * 100) : null }
  }
  return { studentCount: n, pass: rate(s.attainment.passMark), distinction: rate(s.attainment.distinctionMark) }
}

// tiers: paper.difficulties in order from easiest to hardest. Each tier with
// questions is compared with the previous tier that has questions.
export function tierProgression(tiers, s) {
  const present = tiers.filter((t) => t.availableMarks > 0 && !missing(t.pct?.mean))
  return present.slice(1).map((harder, i) => {
    const easier = present[i]
    const changePp = round(harder.pct.mean - easier.pct.mean)
    return {
      easier: easier.difficulty,
      harder: harder.difficulty,
      easierMeanPct: easier.pct.mean,
      harderMeanPct: harder.pct.mean,
      changePp,
      inverted: changePp > s.tiers.inversionTolerancePp,
    }
  })
}

// gapPp = actual - expected (percentage points).
export function gapVerdict(gapPp, s) {
  if (missing(gapPp)) return null
  const size = Math.abs(gapPp)
  const direction = gapPp > 0 ? 'above' : gapPp < 0 ? 'below' : null
  if (size < s.simulationGap.alignedBelow) return verdict('aligned', 'Aligned', 'good', { direction })
  if (size < s.simulationGap.largeFrom) return verdict('moderate', 'Moderate', 'warn', { direction })
  return verdict('large', 'Large', 'bad', { direction })
}

export function spreadVerdict(spreadPp, s) {
  if (missing(spreadPp)) return null
  if (spreadPp < s.dimensionSpread.balancedBelow) return verdict('balanced', 'Balanced', 'good')
  if (spreadPp < s.dimensionSpread.highFrom) return verdict('moderate', 'Moderate', 'warn')
  return verdict('high', 'High', 'bad')
}

// row: a paper.questions.rows entry. Returns [{ id, label, tone }].
export function questionFlags(row, s) {
  const flags = []
  const q = s.questionFlags
  if (!missing(row.solveRatePct) && row.solveRatePct >= q.tooEasyFrom) flags.push({ id: 'too-easy', label: 'Too easy', tone: 'info' })
  if (!missing(row.solveRatePct) && row.solveRatePct < q.tooHardBelow) flags.push({ id: 'too-hard', label: 'Too hard', tone: 'warn' })
  if (!missing(row.attemptRatePct) && row.attemptRatePct < q.lowAttemptBelow) flags.push({ id: 'low-attempt', label: 'Many skipped', tone: 'warn' })
  if (!missing(row.discriminationIndex) && row.discriminationIndex < 0) flags.push({ id: 'negative-discrimination', label: 'Negative discrimination', tone: 'bad' })
  return flags
}

export function discriminationVerdict(index, s) {
  if (missing(index)) return null
  if (index < 0) return verdict('negative', 'Negative', 'bad')
  if (index < s.discrimination.poorBelow) return verdict('poor', 'Poor', 'bad')
  if (index < s.discrimination.goodFrom) return verdict('fair', 'Fair', 'warn')
  return verdict('good', 'Good', 'good')
}

export function reliabilityVerdict(alpha, s) {
  if (missing(alpha)) return null
  return alpha >= s.reliability.acceptableFrom ? verdict('acceptable', 'Acceptable', 'good') : verdict('low', 'Low', 'bad')
}

export function trendVerdict(deltaPp, s) {
  if (missing(deltaPp)) return null
  const limit = s.trend.notableChangePp
  if (deltaPp >= limit) return verdict('gain', 'Gain', 'good')
  if (deltaPp <= -limit) return verdict('drop', 'Drop', 'bad')
  return verdict('steady', 'Steady', 'neutral')
}

export function blueprintVerdict(actualPct, targetPct, s) {
  if (missing(targetPct) || missing(actualPct)) return null
  const diff = actualPct - targetPct
  if (Math.abs(diff) <= s.blueprint.tolerancePp) return verdict('on-target', 'On target', 'good')
  return diff > 0 ? verdict('over', 'Over', 'warn') : verdict('under', 'Under', 'warn')
}

// Why a student should be looked at, using the pass mark and dimension levels.
// student: a student profile; cohort: the cohort profile. Returns [{ id, label, tone }].
export function attentionReasons(student, cohort, s) {
  const reasons = []
  const { passMark } = s.attainment
  if (!missing(student.masteryPct)) {
    if (student.masteryPct < passMark) reasons.push({ id: 'below-pass', label: 'Below pass mark', tone: 'bad' })
    else if (student.masteryPct < passMark + s.attention.nearPassMarginPp) reasons.push({ id: 'near-pass', label: 'Near pass mark', tone: 'warn' })
  }
  const weak = Object.keys(student.dimensions).filter(
    (d) => studentLevel(student.dimensions[d].masteryPct, cohort.dimensions[d]?.masteryPct, s)?.level === 'weak'
  )
  if (weak.length >= s.attention.weakDimensionCount) {
    reasons.push({ id: 'weak-dimensions', label: `Weak in ${weak.length} dimensions`, tone: 'warn' })
  }
  return reasons
}

export function sectionSizeVerdict(studentCount, s) {
  return studentCount < s.sections.minSize ? verdict('small', 'Small section', 'warn') : null
}

// p: p-value of a test for a difference between groups.
export function differenceVerdict(p, s) {
  if (missing(p)) return null
  return p < s.sections.significance ? verdict('significant', 'Significant', 'info') : verdict('not-significant', 'Not significant', 'neutral')
}
