import { cleanId, issue, lowerRow } from './common.js'

// The coding sheet has one row per student per question. partial_marks is the
// share of test cases passed (0 to 1); blank means the question was not attempted.
// Returns { questions, students, fractions: { studentId: { questionId: 0..1 } }, issues }.
export function readCoding(parsed) {
  const questions = new Map()
  const students = new Map()
  const fractions = {}
  const issues = []
  const above = []

  for (const raw of parsed.data ?? []) {
    const row = lowerRow(raw)
    const studentId = cleanId(row.user_id)
    const questionId = cleanId(row.question_id)
    if (!studentId || !questionId) continue

    if (!questions.has(questionId)) {
      questions.set(questionId, { id: questionId, title: row['question title'], difficulty: row.difficulty_type, totalCases: Number(row['total test case']) || 0 })
    }
    const absent = row.attendance.toLowerCase() === 'absent'
    const known = students.get(studentId)
    if (known) known.absent ||= absent
    else students.set(studentId, { id: studentId, name: row['student name'], absent })

    const text = row.final_scaled_marks || row.partial_marks
    fractions[studentId] ??= {}
    if (text === '') continue
    let fraction = Number(text)
    if (!Number.isFinite(fraction)) continue
    if (fraction > 1) {
      above.push(`${studentId}/${questionId}`)
      fraction = 1
    }
    fraction = Math.max(0, fraction)

    if (questionId in fractions[studentId]) {
      issues.push(issue('warning', `Student ${studentId} has more than one row for question ${questionId}; the higher score was kept`))
      fraction = Math.max(fraction, fractions[studentId][questionId])
    }
    fractions[studentId][questionId] = fraction
  }

  if (above.length) issues.push(issue('warning', `${above.length} score(s) above 1 were limited to 1: ${above.slice(0, 5).join(', ')}`))
  return { questions: [...questions.values()], students: [...students.values()], fractions, issues }
}
