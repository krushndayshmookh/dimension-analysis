// Which analytics sheet a CSV is, judged by its header columns.
const has = (fields, ...names) => names.every((n) => fields.includes(n))

export function detectSheet(fields) {
  const f = (fields ?? []).map((x) => String(x).trim().toLowerCase())
  if (has(f, 'question id', 'type', 'dimensions')) return 'listing'
  if (has(f, 'question_id', 'partial_marks', 'total test case')) return 'coding'
  if (has(f, 'question_id', 'question_no', 'marks_contest')) return 'quiz'
  if (has(f, 'student_id', 'student_name')) return 'enrolled'
  return null
}

export const SHEET_LABELS = {
  listing: 'Question listing',
  coding: 'Coding scores',
  quiz: 'Quiz scores',
  enrolled: 'Enrolled students',
}
