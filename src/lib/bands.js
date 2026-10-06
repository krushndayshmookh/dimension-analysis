import { round } from './stats.js'

const byLimitDescending = (bands) => [...bands].sort((a, b) => b.from - a.from)

// The label of the highest band whose lower limit `masteryPct` reaches.
export function assignBand(masteryPct, bands) {
  if (masteryPct == null || !Number.isFinite(masteryPct)) return null
  return byLimitDescending(bands).find((b) => masteryPct >= b.from)?.label ?? null
}

// students: [{ id, masteryPct }]. Returns the bands highest first with the
// students in each (a band covers from <= mastery < the next band's limit).
export function bandDistribution(students, bands) {
  const ordered = byLimitDescending(bands)
  const result = ordered.map((band, i) => ({
    label: band.label,
    from: band.from,
    to: i === 0 ? 100 : ordered[i - 1].from,
    count: 0,
    percentage: 0,
    studentIds: [],
  }))
  for (const s of students) {
    const label = assignBand(s.masteryPct, bands)
    const entry = result.find((b) => b.label === label)
    if (entry) {
      entry.count++
      entry.studentIds.push(s.id)
    }
  }
  for (const entry of result) entry.percentage = students.length ? round((entry.count / students.length) * 100) : 0
  return result
}

// For each whole-number cutoff from 0 to 100: students at or above it.
export function cutoffCurve(masteryPcts) {
  return Array.from({ length: 101 }, (_, cutoff) => {
    const count = masteryPcts.filter((p) => p >= cutoff).length
    return { cutoff, count, ratePct: masteryPcts.length ? round((count / masteryPcts.length) * 100) : null }
  })
}

// Students below the cutoff by no more than `withinPp` points, closest first.
// students: [{ id, name, masteryPct, totalMarks }].
export function borderlineStudents(students, cutoffPct, withinPp) {
  return students
    .filter((s) => s.masteryPct != null && s.masteryPct < cutoffPct && cutoffPct - s.masteryPct <= withinPp)
    .map((s) => ({
      id: s.id,
      name: s.name,
      masteryPct: s.masteryPct,
      shortfallPp: round(cutoffPct - s.masteryPct),
      marksShort: round(((cutoffPct - s.masteryPct) / 100) * s.totalMarks),
    }))
    .sort((a, b) => a.shortfallPp - b.shortfallPp)
}
