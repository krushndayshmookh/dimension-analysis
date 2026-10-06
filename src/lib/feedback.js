// The content of one student's feedback sheet. Fields the instructor has not
// switched on are left out entirely, so they can never be printed by accident.
export const DEFAULT_FEEDBACK_OPTIONS = {
  lowestTopics: 3,
  showRank: false,
  showPercentile: false,
  showCohortAverage: false,
  showLevels: false,
  showQuestionMarks: true,
  comment: '',
}

const slug = (text) => String(text).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// The id keeps its case; the name is lower-cased.
export const feedbackFileName = ({ studentId, studentName }) =>
  ['feedback', slug(studentId), slug(studentName).toLowerCase()].filter(Boolean).join('-')

// student: a profile; ctx: { dataset, profiles, exam: { courseName, examTitle, examDate } }.
export function buildFeedback(student, ctx, options = DEFAULT_FEEDBACK_OPTIONS) {
  const o = { ...DEFAULT_FEEDBACK_OPTIONS, ...options }
  const { dataset, profiles, exam } = ctx
  const cohort = profiles.cohort

  const overall = {
    earned: student.earned,
    totalMarks: student.totalMarks,
    attemptedMarks: student.attemptedMarks,
    masteryPct: student.masteryPct,
    accuracyPct: student.accuracyPct,
  }
  if (o.showRank) {
    overall.rank = student.rank
    overall.studentCount = profiles.students.length
  }
  if (o.showPercentile) overall.percentile = student.percentile
  if (o.showCohortAverage) overall.cohortMasteryPct = cohort.masteryPct

  const dimensions = profiles.dimensions.map((dimension) => {
    const own = student.dimensions[dimension]
    const row = { dimension, earned: own.earned, availableExam: own.availableExam, masteryPct: own.masteryPct }
    if (o.showCohortAverage) {
      const cohortPct = cohort.dimensions[dimension].masteryPct
      row.cohortMasteryPct = cohortPct
      row.differencePp = own.masteryPct == null || cohortPct == null ? null : Math.round((own.masteryPct - cohortPct) * 100) / 100
    }
    return row
  })

  const lowestTopics = profiles.topics
    .map((topic) => ({ topic, ...student.topics[topic] }))
    .filter((t) => t.masteryPct != null)
    .sort((a, b) => a.masteryPct - b.masteryPct || a.topic.localeCompare(b.topic))
    .slice(0, Math.max(0, o.lowestTopics))
    .map((t) => ({ topic: t.topic, masteryPct: t.masteryPct, earned: t.earned, available: t.availableExam }))

  const raw = dataset.students.find((s) => s.id === student.id)
  const sheet = {
    header: {
      courseName: exam.courseName,
      examTitle: exam.examTitle,
      examDate: exam.examDate,
      studentId: student.id,
      studentName: student.name,
      section: student.section ?? null,
    },
    overall,
    dimensions,
    lowestTopics,
    radar: {
      values: Object.fromEntries(dimensions.map((d) => [d.dimension, d.masteryPct])),
    },
    comment: o.comment ?? '',
  }
  if (o.showCohortAverage) {
    sheet.radar.reference = Object.fromEntries(profiles.dimensions.map((d) => [d, cohort.dimensions[d].masteryPct]))
  }
  if (o.showQuestionMarks) {
    sheet.questions = dataset.questions.map((q) => {
      const attempted = raw ? q.id in raw.scores : false
      return {
        id: q.id,
        type: q.type,
        difficulty: q.difficulty,
        dimensions: q.dimensions,
        topics: q.topics,
        marks: q.marks,
        earned: attempted ? raw.scores[q.id] : null,
        attempted,
      }
    })
  }
  return sheet
}
