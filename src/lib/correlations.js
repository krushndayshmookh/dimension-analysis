import { round } from './stats.js'

// Pearson correlation of two equal-length lists; null with fewer than three
// pairs or when either list has no variation.
export function pearson(xs, ys) {
  const n = xs.length
  if (n < 3) return null
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my)
    sxx += (xs[i] - mx) ** 2
    syy += (ys[i] - my) ** 2
  }
  if (sxx === 0 || syy === 0) return null
  const r = sxy / Math.sqrt(sxx * syy)
  return Math.max(-1, Math.min(1, r))
}

const valueOf = (student, group, name) => student[group][name]?.masteryPct

// Correlation between students' mastery in every pair of dimensions (or tiers, or
// topics). Each coefficient uses the students who have a value for both.
export function correlationMatrix(profiles, group = 'dimensions') {
  const names = profiles[group]
  const students = profiles.students
  const pairData = (a, b) => {
    const xs = []
    const ys = []
    for (const s of students) {
      const x = valueOf(s, group, a)
      const y = valueOf(s, group, b)
      if (x != null && y != null) {
        xs.push(x)
        ys.push(y)
      }
    }
    return { xs, ys }
  }

  const matrix = names.map(() => names.map(() => null))
  const counts = names.map(() => names.map(() => 0))
  const pairs = []
  names.forEach((a, i) => {
    names.forEach((b, j) => {
      if (j < i) return
      const { xs, ys } = pairData(a, b)
      const r = pearson(xs, ys)
      const value = r == null ? null : round(r)
      matrix[i][j] = matrix[j][i] = value
      counts[i][j] = counts[j][i] = xs.length
      if (i !== j) pairs.push({ a, b, r: value, n: xs.length })
    })
  })
  pairs.sort((p, q) => Math.abs(q.r ?? -1) - Math.abs(p.r ?? -1))
  return { names, matrix, counts, pairs, studentCount: students.length }
}

// The data behind one cell of the matrix: one point per student.
export function scatterPoints(profiles, group, a, b) {
  return profiles.students
    .map((s) => ({ id: s.id, name: s.name, x: valueOf(s, group, a), y: valueOf(s, group, b) }))
    .filter((p) => p.x != null && p.y != null)
}
