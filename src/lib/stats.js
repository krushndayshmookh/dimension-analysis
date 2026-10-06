export const round = (value, decimals = 2) => {
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

const finite = (values) => (values ?? []).filter((v) => typeof v === 'number' && Number.isFinite(v))

// Population statistics. Every statistic is null when there are no values.
export function describe(values) {
  const nums = finite(values)
  const count = nums.length
  if (!count) return { count: 0, mean: null, median: null, min: null, max: null, stdDev: null }

  const sorted = [...nums].sort((a, b) => a - b)
  const mean = nums.reduce((sum, v) => sum + v, 0) / count
  const mid = Math.floor(count / 2)
  const median = count % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  const variance = nums.reduce((sum, v) => sum + (v - mean) ** 2, 0) / count

  return {
    count,
    mean: round(mean),
    median: round(median),
    min: round(sorted[0]),
    max: round(sorted[count - 1]),
    stdDev: round(Math.sqrt(variance)),
  }
}

function emptyBin(index, minValue, maxValue, label) {
  return { index, label, minValue, maxValue, count: 0, percentage: 0, studentIds: [] }
}

function fillBins(bins, entries) {
  // entries: [{ id, index }]
  for (const { id, index } of entries) {
    bins[index].count++
    bins[index].studentIds.push(id)
  }
  const total = entries.length
  for (const bin of bins) bin.percentage = total ? round((bin.count / total) * 100) : 0
  return bins
}

// Ten half-open bins [0,10) ... [90,100], the last one closed.
// items: [{ id, pct }]
export function decileBins(items) {
  const bins = Array.from({ length: 10 }, (_, i) => ({
    ...emptyBin(i, i * 10, (i + 1) * 10, `${i * 10}-${(i + 1) * 10}%`),
    minPct: i * 10,
    maxPct: (i + 1) * 10,
  }))
  const entries = (items ?? [])
    .filter((item) => Number.isFinite(item.pct))
    .map((item) => {
      const pct = Math.min(100, Math.max(0, item.pct))
      return { id: item.id, index: pct >= 100 ? 9 : Math.floor(pct / 10) }
    })
  return fillBins(bins, entries)
}

// A step of 1, 2, 5 or 10 x 10^k giving at most about ten bins.
export function niceStep(totalMarks) {
  const target = totalMarks / 10
  if (target <= 1) return 1
  const magnitude = 10 ** Math.floor(Math.log10(target))
  for (const multiple of [1, 2, 5, 10]) {
    if (multiple * magnitude >= target) return multiple * magnitude
  }
  return 10 * magnitude
}

// Equal-width half-open mark bins covering 0..totalMarks; the last bin is
// closed and may be shorter. Identical totals give identical edges, so two
// cohorts can be compared bin by bin. items: [{ id, earned }]
export function markBins(items, totalMarks) {
  if (!(totalMarks > 0)) return []
  const step = niceStep(totalMarks)
  const count = Math.ceil(totalMarks / step)
  const bins = Array.from({ length: count }, (_, i) => {
    const min = i * step
    const max = Math.min((i + 1) * step, totalMarks)
    return { ...emptyBin(i, min, max, `${min}-${max}`), minMarks: min, maxMarks: max }
  })
  const entries = (items ?? [])
    .filter((item) => Number.isFinite(item.earned))
    .map((item) => {
      const earned = Math.min(totalMarks, Math.max(0, item.earned))
      return { id: item.id, index: earned >= totalMarks ? count - 1 : Math.min(count - 1, Math.floor(earned / step)) }
    })
  return fillBins(bins, entries)
}

// ---- one-way ANOVA ---------------------------------------------------------------

// Lanczos approximation of ln(Gamma(x)).
function logGamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]
  let y = x
  let tmp = x + 5.5
  tmp -= (x + 0.5) * Math.log(tmp)
  let series = 1.000000000190015
  for (const coefficient of c) series += coefficient / ++y
  return -tmp + Math.log((2.5066282746310005 * series) / x)
}

// Continued fraction for the incomplete beta function (modified Lentz).
function betaContinuedFraction(x, a, b) {
  const tiny = 1e-30
  let c = 1
  let d = 1 - ((a + b) * x) / (a + 1)
  d = 1 / (Math.abs(d) < tiny ? tiny : d)
  let h = d
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2))
    d = 1 + aa * d
    d = 1 / (Math.abs(d) < tiny ? tiny : d)
    c = 1 + aa / c
    if (Math.abs(c) < tiny) c = tiny
    h *= d * c
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1))
    d = 1 + aa * d
    d = 1 / (Math.abs(d) < tiny ? tiny : d)
    c = 1 + aa / c
    if (Math.abs(c) < tiny) c = tiny
    const delta = d * c
    h *= delta
    if (Math.abs(delta - 1) < 3e-12) break
  }
  return h
}

// Regularized incomplete beta function I_x(a, b).
function regularizedBeta(x, a, b) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const front = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x))
  return x < (a + 1) / (a + b + 2)
    ? (front * betaContinuedFraction(x, a, b)) / a
    : 1 - (front * betaContinuedFraction(1 - x, b, a)) / b
}

// groups: arrays of numbers. Returns { f, p, df1, df2 } for the null hypothesis
// that all group means are equal, or null when the test cannot be computed
// (fewer than two groups, an empty group, no degrees of freedom or no variation
// within the groups).
export function oneWayAnova(groups) {
  const k = groups.length
  if (k < 2 || groups.some((g) => g.length === 0)) return null
  const n = groups.reduce((sum, g) => sum + g.length, 0)
  const df1 = k - 1
  const df2 = n - k
  if (df2 < 1) return null
  const grand = groups.flat().reduce((a, b) => a + b, 0) / n
  const means = groups.map((g) => g.reduce((a, b) => a + b, 0) / g.length)
  const between = groups.reduce((sum, g, i) => sum + g.length * (means[i] - grand) ** 2, 0)
  const within = groups.reduce((sum, g, i) => sum + g.reduce((s, v) => s + (v - means[i]) ** 2, 0), 0)
  if (within <= 1e-12) return null
  const f = between / df1 / (within / df2)
  const p = f <= 0 ? 1 : regularizedBeta(df2 / (df2 + df1 * f), df2 / 2, df1 / 2)
  return { f: round(f, 3), p: round(p, 4), df1, df2 }
}
