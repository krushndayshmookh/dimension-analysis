import { round } from './stats.js'
import { QUESTION_TYPES } from './constants.js'
import * as V from './verdicts.js'

const EPSILON = 1e-9
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null)
const rounded = (v) => (v == null ? null : round(v))

export const TYPE_FILTERS = ['both', 'assignment', 'assessment']

// The dataset with only the questions of one type ('both' keeps everything).
// Every student stays, so rates and totals are over the chosen questions.
export const onlyType = (dataset, type) =>
  type === 'both' || !type ? dataset : { ...dataset, questions: dataset.questions.filter((q) => q.type === type) }

// The question types present, assignment first.
export const typesIn = (dataset) => QUESTION_TYPES.filter((t) => dataset.questions.some((q) => q.type === t))

// How students attempted (or skipped) questions. An unattempted question is a
// blank score cell. dataset: { questions, students }, profiles from buildProfiles.
export function analyzeAttempts(dataset, profiles) {
  const { questions } = dataset
  const students = dataset.students.filter((s) => !s.absent)
  const absentCount = dataset.students.length - students.length
  const masteryById = new Map(profiles.students.map((s) => [s.id, s.masteryPct ?? 0]))
  const n = students.length
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0)

  const questionRows = questions.map((q, i) => {
    const attempters = []
    const skippers = []
    let zero = 0
    let partial = 0
    let full = 0
    for (const s of students) {
      if (!(q.id in s.scores)) {
        skippers.push(masteryById.get(s.id))
        continue
      }
      attempters.push(masteryById.get(s.id))
      const score = s.scores[q.id]
      if (score <= EPSILON) zero++
      else if (score >= q.marks - EPSILON) full++
      else partial++
    }
    const attemptedCount = attempters.length
    const skipperMean = mean(skippers)
    const attempterMean = mean(attempters)
    return {
      id: q.id,
      position: i + 1,
      attemptedCount,
      skippedCount: skippers.length,
      attemptRatePct: n ? rounded((attemptedCount / n) * 100) : null,
      zeroCount: zero,
      partialCount: partial,
      fullCount: full,
      zeroRateOfAttemptedPct: attemptedCount ? rounded((zero / attemptedCount) * 100) : null,
      skipperMeanMasteryPct: rounded(skipperMean),
      attempterMeanMasteryPct: rounded(attempterMean),
      attempterMinusSkipperPp: skipperMean == null || attempterMean == null ? null : rounded(attempterMean - skipperMean),
    }
  })

  const studentRows = students.map((s) => {
    const attempted = questions.filter((q) => q.id in s.scores)
    const skippedMarks = questions.filter((q) => !(q.id in s.scores)).reduce((sum, q) => sum + q.marks, 0)
    return {
      id: s.id,
      name: s.name,
      section: s.section ?? null,
      attemptedCount: attempted.length,
      skippedCount: questions.length - attempted.length,
      skippedIds: questions.filter((q) => !(q.id in s.scores)).map((q) => q.id),
      attemptRatePct: questions.length ? rounded((attempted.length / questions.length) * 100) : null,
      skippedMarks: round(skippedMarks),
      skippedMarksPct: totalMarks > 0 ? rounded((skippedMarks / totalMarks) * 100) : null,
    }
  })

  const skippedMarks = studentRows.reduce((sum, s) => sum + s.skippedMarks, 0)
  return {
    questions: questionRows,
    students: studentRows,
    totals: {
      absentCount,
      skippedMarks: round(skippedMarks),
      skippedMarksPct: totalMarks > 0 && n ? rounded((skippedMarks / (totalMarks * n)) * 100) : null,
      meanStudentAttemptRatePct: rounded(mean(studentRows.map((s) => s.attemptRatePct).filter((v) => v != null))),
    },
  }
}

// How much each reason adds to a question's severity (and so its place in the queue).
const WEIGHTS = {
  'negative-discrimination': 3,
  'high-deviation': 3,
  'poor-discrimination': 2,
  'low-attempt': 2,
  'lowers-reliability': 2,
  reused: 2,
  'medium-deviation': 1,
  'too-easy': 1,
  'too-hard': 1,
}

// rows: paper.questions.rows (with item statistics); reliability: paper.reliability;
// reuse: findReuse() result. Returns questions that have at least one reason,
// most severe first, then in paper order.
export function buildReviewQueue({ rows, reliability, reuse, settings }) {
  const queue = []
  rows.forEach((row, position) => {
    const reasons = V.questionFlags(row, settings).map(({ id, label, tone }) => ({ id, label, tone }))

    const discrimination = V.discriminationVerdict(row.discriminationIndex, settings)
    if (discrimination?.level === 'poor') reasons.push({ id: 'poor-discrimination', label: 'Poor discrimination', tone: 'warn' })

    const deviation = V.deviationVerdict(row.deviationPct, settings)
    if (deviation?.level === 'high') reasons.push({ id: 'high-deviation', label: 'High deviation', tone: 'bad' })
    else if (deviation?.level === 'medium') reasons.push({ id: 'medium-deviation', label: 'Medium deviation', tone: 'warn' })

    if (reliability?.alpha != null && row.alphaIfRemoved != null && round(row.alphaIfRemoved - reliability.alpha, 4) >= settings.review.alphaGainFrom) {
      reasons.push({ id: 'lowers-reliability', label: 'Lowers reliability', tone: 'warn' })
    }

    const earlier = reuse[row.id]
    if (settings.review.flagReuse && earlier?.length) {
      reasons.push({ id: 'reused', label: `Reused (${earlier.length} earlier exam${earlier.length === 1 ? '' : 's'})`, tone: 'warn' })
    }

    if (reasons.length) {
      queue.push({ id: row.id, type: row.type, position: position + 1, reasons, severity: reasons.reduce((sum, r) => sum + (WEIGHTS[r.id] ?? 1), 0) })
    }
  })
  return queue.sort((a, b) => b.severity - a.severity || a.position - b.position)
}
