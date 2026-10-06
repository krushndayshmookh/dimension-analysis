import { cleanId, issue, lowerRow } from './common.js'

// The quiz sheet has one row per student per question. Marks can be negative
// (negative marking); we do not use it, so they count as 0. A question with no
// attempt is left blank.
export function readQuiz(parsed) {
  const questions = new Map()
  const students = new Map()
  const cells = [] // { studentId, questionId, marks, attempted }
  const issues = []
  let negative = 0

  for (const raw of parsed.data ?? []) {
    const row = lowerRow(raw)
    const studentId = cleanId(row.user_id)
    const questionId = cleanId(row.question_id)
    if (!studentId || !questionId) continue

    if (!questions.has(questionId)) {
      questions.set(questionId, { id: questionId, no: Number(row.question_no) || 0, type: row.question_type, difficulty: row.difficulty_level, maxMarks: 0 })
    }
    const absent = row.attendance.toLowerCase() === 'absent'
    const known = students.get(studentId)
    if (known) known.absent ||= absent
    else students.set(studentId, { id: studentId, name: row.student_name, absent })

    const marks = Number(row.marks_contest)
    if (!Number.isFinite(marks)) continue
    if (marks < 0) negative++
    const attempted = Number(row.attempt_count) > 0 || marks !== 0
    cells.push({ studentId, questionId, marks: Math.max(0, marks), attempted })
    const question = questions.get(questionId)
    question.maxMarks = Math.max(question.maxMarks, marks)
  }

  const fractions = Object.fromEntries([...students.keys()].map((id) => [id, {}]))
  for (const { studentId, questionId, marks, attempted } of cells) {
    if (!attempted) continue
    const max = questions.get(questionId).maxMarks
    fractions[studentId][questionId] = max > 0 ? marks / max : 0
  }

  if (negative) issues.push(issue('info', `${negative} negative mark(s) were counted as 0`))
  const ordered = [...questions.values()].sort((a, b) => a.no - b.no)
  return { questions: ordered, students: [...students.values()], fractions, issues }
}
