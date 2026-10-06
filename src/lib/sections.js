import { round, describe, decileBins, oneWayAnova } from './stats.js'

const UNASSIGNED = 'Unassigned'
const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null)
const rounded = (v) => (v == null ? null : round(v))

function sampleVariance(values) {
  const m = mean(values)
  return values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1)
}

// Standardised difference between a group and everyone else (pooled SD).
function cohensD(group, rest) {
  if (group.length < 2 || rest.length < 2) return null
  const pooled = Math.sqrt(((group.length - 1) * sampleVariance(group) + (rest.length - 1) * sampleVariance(rest)) / (group.length + rest.length - 2))
  return pooled > 0 ? rounded((mean(group) - mean(rest)) / pooled) : null
}

// Compares sections (batches). Students without a section form "Unassigned" when
// other students have one. With no sections at all there is nothing to compare.
export function analyzeSections(profiles) {
  const { students, dimensions, difficulties } = profiles
  const cohort = {
    mastery: describe(students.map((s) => s.masteryPct)),
    dimensions: Object.fromEntries(dimensions.map((d) => [d, profiles.cohort.dimensions[d].masteryPct])),
  }
  if (!students.some((s) => s.section != null)) {
    return { hasSections: false, sections: [], cohort, anova: null, dimensionTests: [] }
  }

  const groups = new Map()
  for (const s of students) {
    const name = s.section ?? UNASSIGNED
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name).push(s)
  }
  const names = [...groups.keys()].sort((a, b) => (a === UNASSIGNED ? 1 : b === UNASSIGNED ? -1 : natural(a, b)))

  const meanOf = (members, pick) => rounded(mean(members.map(pick).filter((v) => v != null)))

  const sections = names.map((name) => {
    const members = groups.get(name)
    const pcts = members.map((s) => s.masteryPct)
    const others = students.filter((s) => !members.includes(s)).map((s) => s.masteryPct)
    const sectionMean = mean(pcts)
    const dimensionMeans = Object.fromEntries(dimensions.map((d) => [d, meanOf(members, (s) => s.dimensions[d].masteryPct)]))
    return {
      name,
      unassigned: name === UNASSIGNED,
      studentCount: members.length,
      studentIds: members.map((s) => s.id),
      masteryPcts: pcts,
      mastery: describe(pcts),
      earned: describe(members.map((s) => s.earned)),
      meanVsCohortPp: rounded(sectionMean - cohort.mastery.mean),
      dimensions: dimensionMeans,
      dimensionVsCohortPp: Object.fromEntries(
        dimensions.map((d) => [d, dimensionMeans[d] == null || cohort.dimensions[d] == null ? null : rounded(dimensionMeans[d] - cohort.dimensions[d])])
      ),
      difficulties: Object.fromEntries(difficulties.map((t) => [t, meanOf(members, (s) => s.difficulties[t].masteryPct)])),
      distribution: decileBins(members.map((s) => ({ id: s.id, pct: s.masteryPct }))).map((b) => b.percentage),
      cohensD: cohensD(pcts, others),
    }
  })

  return {
    hasSections: true,
    sections,
    cohort,
    anova: oneWayAnova(names.map((n) => groups.get(n).map((s) => s.masteryPct))),
    dimensionTests: dimensions.map((dimension) => ({
      dimension,
      ...(oneWayAnova(names.map((n) => groups.get(n).map((s) => s.dimensions[dimension].masteryPct).filter((v) => v != null))) ?? { f: null, p: null, df1: null, df2: null }),
    })),
  }
}
