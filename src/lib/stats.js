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
