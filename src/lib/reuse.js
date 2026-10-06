import { round } from './stats.js'

// A question is the same question in another exam when its type and its id
// both match (ids compared ignoring case).
const keyOf = (q) => `${q.type}|${String(q.id).toLowerCase()}`

// Compact per-question results stored with each exam so later exams can be
// compared with it without loading its scores.
export function questionSummaries(paper) {
  return paper.questions.rows.map((r) => ({
    id: r.id,
    type: r.type,
    difficulty: r.difficulty,
    marks: r.marks,
    studentCount: r.studentCount,
    solveRatePct: r.solveRatePct,
    expectedSolveRatePct: r.expectedSolveRatePct,
    meanScorePct: r.meanScorePct,
    attemptRatePct: r.attemptRatePct,
    discriminationIndex: r.discriminationIndex,
  }))
}

// questions: [{ id, type }] of the exam being viewed; index: saved-exam index
// entries with questionSummaries. Returns { [questionId]: [appearance] } for
// each question that appeared in another saved exam, oldest exam first.
export function findReuse(currentExamId, questions, index) {
  const seen = new Map()
  for (const entry of index) {
    if (entry.id === currentExamId) continue
    for (const summary of entry.questionSummaries ?? []) {
      const key = keyOf(summary)
      if (!seen.has(key)) seen.set(key, [])
      seen.get(key).push({
        examId: entry.id,
        courseName: entry.courseName,
        examTitle: entry.examTitle,
        examDate: entry.examDate,
        studentCount: summary.studentCount,
        solveRatePct: summary.solveRatePct,
        expectedSolveRatePct: summary.expectedSolveRatePct,
        meanScorePct: summary.meanScorePct,
        discriminationIndex: summary.discriminationIndex,
      })
    }
  }
  const reuse = {}
  for (const q of questions) {
    const appearances = seen.get(keyOf(q))
    if (appearances) reuse[q.id] = [...appearances].sort((a, b) => String(a.examDate).localeCompare(String(b.examDate)))
  }
  return reuse
}

export function reuseSummary(questionCount, reuse) {
  const reusedCount = Object.keys(reuse).length
  return {
    questionCount,
    reusedCount,
    reusedPct: questionCount ? round((reusedCount / questionCount) * 100) : null,
    examCount: new Set(Object.values(reuse).flatMap((list) => list.map((a) => a.examId))).size,
  }
}
