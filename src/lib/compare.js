import { round } from './stats.js'

const delta = (later, base) => (later == null || base == null ? null : round(later - base))

// base / later: { students: [profile], cohort } as produced by buildProfiles.
// Students are matched by id; dimensions present in either exam are compared.
export function compareExams(base, later) {
  const dimensionNames = [...new Set([...Object.keys(base.cohort.dimensions), ...Object.keys(later.cohort.dimensions)])]
  const laterById = new Map(later.students.map((s) => [s.id, s]))
  const baseIds = new Set(base.students.map((s) => s.id))

  const students = base.students
    .filter((s) => laterById.has(s.id))
    .map((b) => {
      const l = laterById.get(b.id)
      return {
        id: b.id,
        name: l.name ?? b.name,
        baseMasteryPct: b.masteryPct,
        laterMasteryPct: l.masteryPct,
        deltaPp: delta(l.masteryPct, b.masteryPct),
        dimensions: Object.fromEntries(
          dimensionNames.map((d) => {
            const basePct = b.dimensions[d]?.masteryPct ?? null
            const laterPct = l.dimensions[d]?.masteryPct ?? null
            return [d, { basePct, laterPct, deltaPp: delta(laterPct, basePct) }]
          })
        ),
      }
    })

  return {
    cohort: {
      basePct: base.cohort.masteryPct,
      laterPct: later.cohort.masteryPct,
      deltaPp: delta(later.cohort.masteryPct, base.cohort.masteryPct),
      baseStudents: base.cohort.studentCount,
      laterStudents: later.cohort.studentCount,
    },
    dimensions: dimensionNames.map((dimension) => {
      const basePct = base.cohort.dimensions[dimension]?.masteryPct ?? null
      const laterPct = later.cohort.dimensions[dimension]?.masteryPct ?? null
      return { dimension, basePct, laterPct, deltaPp: delta(laterPct, basePct) }
    }),
    students,
    unmatched: {
      onlyInBase: base.students.filter((s) => !laterById.has(s.id)).map((s) => s.id),
      onlyInLater: later.students.filter((s) => !baseIds.has(s.id)).map((s) => s.id),
    },
  }
}

// exams: a student's history entries in date order. Adds the change from the
// previous exam (null for the first, or where a dimension is missing).
export function historyDeltas(exams) {
  return exams.map((exam, i) => {
    const previous = exams[i - 1]
    if (!previous) return { ...exam, deltaMasteryPct: null, dimensionDeltas: {} }
    const dimensionDeltas = Object.fromEntries(
      Object.keys(exam.dimensions ?? {}).map((d) => [d, delta(exam.dimensions[d]?.masteryPct, previous.dimensions?.[d]?.masteryPct)])
    )
    for (const d of Object.keys(previous.dimensions ?? {})) if (!(d in dimensionDeltas)) dimensionDeltas[d] = null
    return { ...exam, deltaMasteryPct: delta(exam.masteryPct, previous.masteryPct), dimensionDeltas }
  })
}
