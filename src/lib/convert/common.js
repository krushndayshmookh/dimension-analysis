import Papa from 'papaparse'

// Ids in the analytics sheets carry thousands separators ("1,698,982").
export const cleanId = (value) => String(value ?? '').replace(/[,\s]/g, '')

// A row with lower-cased, trimmed keys and trimmed values, so columns can be
// looked up without caring about case.
export function lowerRow(row) {
  const out = {}
  for (const [key, value] of Object.entries(row ?? {})) out[String(key).trim().toLowerCase()] = String(value ?? '').trim()
  return out
}

export const toCsv = (rows, columns) =>
  `${Papa.unparse({ fields: columns, data: rows.map((row) => columns.map((c) => row[c] ?? '')) }, { newline: '\n' })}\n`

export const issue = (level, text) => ({ level, text })

// Combine score-reader results from several files into one score sheet.
export function mergeScoreResults(first, second) {
  const questions = [...first.questions]
  const questionIds = new Set(questions.map((q) => q.id))
  for (const question of second.questions) {
    if (!questionIds.has(question.id)) {
      questions.push(question)
      questionIds.add(question.id)
    }
  }

  const students = [...first.students]
  const studentsById = new Map(students.map((student) => [student.id, student]))
  for (const student of second.students) {
    const existing = studentsById.get(student.id)
    if (!existing) {
      students.push(student)
      studentsById.set(student.id, student)
    } else {
      existing.absent &&= student.absent
      if (!existing.name) existing.name = student.name
    }
  }

  const fractions = Object.fromEntries(
    Object.entries(first.fractions).map(([studentId, cells]) => [studentId, { ...cells }]),
  )
  const duplicateScores = []
  for (const [studentId, cells] of Object.entries(second.fractions)) {
    fractions[studentId] ??= {}
    for (const [questionId, fraction] of Object.entries(cells)) {
      if (questionId in fractions[studentId]) {
        duplicateScores.push(`${studentId}/${questionId}`)
        fractions[studentId][questionId] = Math.max(fractions[studentId][questionId], fraction)
      } else {
        fractions[studentId][questionId] = fraction
      }
    }
  }

  const issues = [...first.issues, ...second.issues]
  if (duplicateScores.length) {
    issues.push(issue('warning', `${duplicateScores.length} score(s) appeared in more than one file; the higher score was kept: ${duplicateScores.slice(0, 5).join(', ')}`))
  }
  return { questions, students, fractions, issues }
}
