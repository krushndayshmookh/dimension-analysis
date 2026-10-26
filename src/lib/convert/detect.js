// Which analytics sheet a CSV is, judged by its header columns.
const has = (fields, ...names) => names.every((n) => fields.includes(n))

export function detectSheet(fields) {
  const f = (fields ?? []).map((x) => String(x).trim().toLowerCase())
  if (has(f, 'question_id', 'question_type', 'question_difficulty', 'question_dimension', 'marks')) return 'listing'
  if (has(f, 'question id', 'type', 'dimensions')) return 'listing'
  if (has(f, 'question_id', 'partial_marks', 'total test case')) return 'coding'
  if (has(f, 'question_id', 'question_no', 'marks_contest')) return 'quiz'
  if (has(f, 'student_id', 'student_name')) return 'enrolled'
  return null
}

// These are valid files for the Upload page, not source sheets for this
// converter. Keep them out of the reader pipeline, but explain the correct
// destination when someone drops them here.
export function explainUnrecognizedSheet(fields) {
  const f = (fields ?? []).map((x) => String(x).trim().toLowerCase())
  if (has(f, 'question_id', 'question_type', 'question_difficulty', 'question_dimension', 'marks')) {
    return 'this is an exam config file; upload it on the Upload page with a matching student_scores.csv'
  }
  if (has(f, 'student_id', 'question_id', 'marks')) {
    return 'this is a long-form scores file; upload it on the Upload page with the matching exam config'
  }
  return 'the columns match none of the four source sheets (question listing, coding scores, quiz scores or enrolled students)'
}

export const SHEET_LABELS = {
  listing: 'Question listing',
  coding: 'Coding scores',
  quiz: 'Quiz scores',
  enrolled: 'Enrolled students',
}
