import { round } from './stats.js'

// Classical test theory statistics. An unattempted question counts as zero
// marks, exactly as it does for mastery.

const GROUP_FRACTION = 0.27

const sum = (values) => values.reduce((a, b) => a + b, 0)
const mean = (values) => sum(values) / values.length

// Sample variance (n - 1); null when it cannot be computed.
function variance(values) {
  if (values.length < 2) return null
  const m = mean(values)
  return sum(values.map((v) => (v - m) ** 2)) / (values.length - 1)
}

function pearson(xs, ys) {
  if (xs.length < 2) return null
  const mx = mean(xs)
  const my = mean(ys)
  let sxy = 0
  let sxx = 0
  let syy = 0
  xs.forEach((x, i) => {
    sxy += (x - mx) * (ys[i] - my)
    sxx += (x - mx) ** 2
    syy += (ys[i] - my) ** 2
  })
  return sxx === 0 || syy === 0 ? null : sxy / Math.sqrt(sxx * syy)
}

// columns: array of per-item score arrays (one entry per student).
function cronbachAlpha(columns) {
  const k = columns.length
  if (k < 2) return null
  const totals = columns[0].map((_, s) => sum(columns.map((c) => c[s])))
  const totalVariance = variance(totals)
  if (!totalVariance) return null
  const itemVariance = sum(columns.map((c) => variance(c)))
  return (k / (k - 1)) * (1 - itemVariance / totalVariance)
}

const rounded = (v, decimals = 2) => (v == null ? null : round(v, decimals))

// dataset: { questions, students: [{ scores }] }
export function analyzeItems(dataset) {
  const { questions, students } = dataset
  const n = students.length
  const columns = questions.map((q) => students.map((s) => s.scores[q.id] ?? 0))
  const totals = students.map((_, s) => sum(columns.map((c) => c[s])))

  // Top and bottom groups by total score; ties keep input order.
  const groupSize = Math.max(1, Math.round(n * GROUP_FRACTION))
  const order = totals.map((total, index) => ({ total, index })).sort((a, b) => b.total - a.total || a.index - b.index)
  const top = order.slice(0, groupSize).map((o) => o.index)
  const bottom = order.slice(n - groupSize).map((o) => o.index)

  const items = questions.map((q, i) => {
    const column = columns[i]
    const fraction = (indices) => mean(indices.map((s) => column[s] / q.marks))
    const rest = totals.map((t, s) => t - column[s])
    const others = columns.filter((_, j) => j !== i)
    return {
      id: q.id,
      discriminationIndex: n >= 2 ? rounded(fraction(top) - fraction(bottom)) : null,
      itemRestCorrelation: rounded(pearson(column, rest)),
      alphaIfRemoved: rounded(cronbachAlpha(others)),
    }
  })

  const alpha = cronbachAlpha(columns)
  const totalVariance = variance(totals)
  const totalSd = totalVariance == null ? null : Math.sqrt(totalVariance)
  return {
    items,
    reliability: {
      alpha: rounded(alpha),
      sem: alpha == null || totalSd == null ? null : rounded(totalSd * Math.sqrt(1 - alpha)),
      itemCount: questions.length,
      studentCount: n,
    },
  }
}
