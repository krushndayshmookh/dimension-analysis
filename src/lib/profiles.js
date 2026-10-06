import { DIMENSIONS, DIFFICULTIES } from './constants.js'
import { round } from './stats.js'

// A question's marks are shared equally across its dimensions, and equally
// across its topics. Difficulty is never shared.
const shareOf = (question, list) => question.marks / list.length

const pct = (earned, available) => (available > 0 ? round((earned / available) * 100) : null)

const emptyAccumulator = () => ({ earned: 0, availableExam: 0, availableAttempted: 0 })

function toBreakdown(acc) {
  return {
    earned: round(acc.earned),
    availableExam: round(acc.availableExam),
    availableAttempted: round(acc.availableAttempted),
    masteryPct: pct(acc.earned, acc.availableExam),
    accuracyPct: pct(acc.earned, acc.availableAttempted),
  }
}

// Calls visit(accumulatorKey, share) for every (category, share) a question counts toward.
function categoriesOf(question) {
  return {
    dimensions: question.dimensions.map((d) => [d, shareOf(question, question.dimensions)]),
    difficulties: [[question.difficulty, question.marks]],
    topics: question.topics.map((t) => [t, shareOf(question, question.topics)]),
  }
}

const extremeDimension = (dimensions, pick) => {
  let best = null
  for (const [name, b] of Object.entries(dimensions)) {
    if (b.masteryPct == null) continue
    if (best === null || pick(b.masteryPct, dimensions[best].masteryPct)) best = name
  }
  return best
}
const strongestOf = (dimensions) => extremeDimension(dimensions, (a, b) => a > b)
const weakestOf = (dimensions) => extremeDimension(dimensions, (a, b) => a < b)

// dataset: { questions: [...], students: [{ id, name, scores }] }
export function buildProfiles(dataset) {
  const { questions, students: rawStudents } = dataset
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0)

  const dimensions = DIMENSIONS.filter((d) => questions.some((q) => q.dimensions.includes(d)))
  const difficulties = DIFFICULTIES.filter((d) => questions.some((q) => q.difficulty === d))
  const topics = [...new Set(questions.flatMap((q) => q.topics))].sort((a, b) => a.localeCompare(b))
  const groups = { dimensions, difficulties, topics }

  const categories = new Map(questions.map((q) => [q.id, categoriesOf(q)]))

  const students = rawStudents.map((student) => {
    const acc = {
      dimensions: Object.fromEntries(dimensions.map((d) => [d, emptyAccumulator()])),
      difficulties: Object.fromEntries(difficulties.map((d) => [d, emptyAccumulator()])),
      topics: Object.fromEntries(topics.map((t) => [t, emptyAccumulator()])),
    }
    let earned = 0
    let attemptedMarks = 0

    for (const q of questions) {
      const attempted = q.id in student.scores
      const score = attempted ? student.scores[q.id] : 0
      if (attempted) {
        earned += score
        attemptedMarks += q.marks
      }
      const cats = categories.get(q.id)
      for (const group of Object.keys(groups)) {
        for (const [name, share] of cats[group]) {
          const a = acc[group][name]
          a.availableExam += share
          if (attempted) {
            a.availableAttempted += share
            a.earned += score * (share / q.marks)
          }
        }
      }
    }

    const profile = {
      id: student.id,
      name: student.name,
      earned: round(earned),
      totalMarks: round(totalMarks),
      attemptedMarks: round(attemptedMarks),
      masteryPct: pct(earned, totalMarks),
      accuracyPct: pct(earned, attemptedMarks),
    }
    for (const group of Object.keys(groups)) {
      profile[group] = Object.fromEntries(groups[group].map((name) => [name, toBreakdown(acc[group][name])]))
    }
    profile.strongestDimension = strongestOf(profile.dimensions)
    profile.weakestDimension = weakestOf(profile.dimensions)
    return profile
  })

  const count = students.length
  const meanOf = (pick) => (count ? students.reduce((sum, s) => sum + pick(s), 0) / count : 0)

  const cohortGroup = (group) =>
    Object.fromEntries(
      groups[group].map((name) => {
        const first = students[0]?.[group][name]
        const earned = meanOf((s) => s[group][name].earned)
        const availableAttempted = meanOf((s) => s[group][name].availableAttempted)
        const availableExam = first?.availableExam ?? 0
        return [
          name,
          {
            earned: round(earned),
            availableExam,
            availableAttempted: round(availableAttempted),
            masteryPct: pct(earned, availableExam),
            accuracyPct: pct(earned, availableAttempted),
          },
        ]
      })
    )

  const cohortEarned = meanOf((s) => s.earned)
  const cohortAttempted = meanOf((s) => s.attemptedMarks)
  const cohortDimensions = cohortGroup('dimensions')
  const cohort = {
    studentCount: count,
    earned: round(cohortEarned),
    totalMarks: round(totalMarks),
    attemptedMarks: round(cohortAttempted),
    masteryPct: pct(cohortEarned, totalMarks),
    accuracyPct: pct(cohortEarned, cohortAttempted),
    dimensions: cohortDimensions,
    difficulties: cohortGroup('difficulties'),
    topics: cohortGroup('topics'),
    strongestDimension: strongestOf(cohortDimensions),
    weakestDimension: weakestOf(cohortDimensions),
  }

  // Ranking: 1 = highest; tied students share a rank. Percentile is the mid-rank
  // percentile. The z-score uses the population standard deviation of mastery.
  const masteries = students.map((s) => s.masteryPct ?? 0)
  const meanMastery = count ? masteries.reduce((a, b) => a + b, 0) / count : 0
  const sd = count ? Math.sqrt(masteries.reduce((a, b) => a + (b - meanMastery) ** 2, 0) / count) : 0
  students.forEach((s, i) => {
    const own = masteries[i]
    const higher = masteries.filter((m) => m > own).length
    const equal = masteries.filter((m) => m === own).length
    s.rank = higher + 1
    s.percentile = round(((count - higher - equal + 0.5 * equal) / count) * 100)
    s.zScore = sd > 0 ? round((own - meanMastery) / sd) : null
  })

  for (const s of students) {
    s.dimensionVsCohort = Object.fromEntries(
      dimensions.map((d) => {
        const own = s.dimensions[d].masteryPct
        const ref = cohortDimensions[d].masteryPct
        return [d, own == null || ref == null ? null : round(own - ref)]
      })
    )
  }

  return { totalMarks: round(totalMarks), dimensions, difficulties, topics, students, cohort }
}
