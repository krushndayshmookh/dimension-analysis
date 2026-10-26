// Which analytics sheet a CSV is, judged by its header columns.
const has = (fields, ...names) => names.every((n) => fields.includes(n))
const normalized = (fields) => (fields ?? []).map((field) => String(field).trim().toLowerCase())

export const SHEET_FIELDS = {
  listing: {
    required: ['question id', 'type', 'dimensions'],
    optional: ['set', 'difficulty', 'topics', 'solve rate', 'comprehensionid'],
    aliases: {
      'question id': ['question id', 'question_id'],
      type: ['type', 'question_type'],
      dimensions: ['dimensions', 'question_dimension'],
      set: ['set'],
      difficulty: ['difficulty', 'question_difficulty'],
      topics: ['topics', 'question_topics'],
      'solve rate': ['solve rate', 'expected_solve_rate'],
      comprehensionid: ['comprehensionid'],
    },
  },
  coding: {
    required: ['user_id', 'question_id', 'question title', 'difficulty_type', 'total test case', 'score'],
    optional: ['partial_marks', 'final_scaled_marks', 'student name', 'attendance'],
    aliases: {
      user_id: ['user_id', 'student_id'],
      question_id: ['question_id'],
      'question title': ['question title'],
      difficulty_type: ['difficulty_type'],
      'total test case': ['total test case'],
      score: ['partial_marks', 'final_scaled_marks'],
      partial_marks: ['partial_marks'],
      final_scaled_marks: ['final_scaled_marks'],
      'student name': ['student name'],
      attendance: ['attendance'],
    },
  },
  quiz: {
    required: ['user_id', 'question_id', 'question_no', 'marks_contest'],
    optional: ['difficulty_level', 'question_type', 'student_name', 'attempt_count', 'attendance'],
    aliases: {
      user_id: ['user_id', 'student_id'],
      question_id: ['question_id'],
      question_no: ['question_no'],
      marks_contest: ['marks_contest', 'marks'],
      difficulty_level: ['difficulty_level'],
      question_type: ['question_type'],
      student_name: ['student_name'],
      attempt_count: ['attempt_count'],
      attendance: ['attendance'],
    },
  },
  enrolled: {
    required: ['student_id', 'student_name'],
    optional: ['section'],
    aliases: {
      student_id: ['student_id'],
      student_name: ['student_name'],
      section: ['section'],
    },
  },
}

export function detectSheet(fields) {
  const f = normalized(fields)
  if (has(f, 'question_id', 'question_type', 'question_difficulty', 'question_dimension', 'marks')) return 'listing'
  if (has(f, 'question id', 'type', 'dimensions')) return 'listing'
  if (has(f, 'question_id', 'partial_marks', 'total test case')) return 'coding'
  if (has(f, 'question_id', 'question_no', 'marks_contest')) return 'quiz'
  if (has(f, 'student_id', 'student_name')) return 'enrolled'
  return null
}

export function initialColumnMapping(type, fields) {
  const sourceFields = fields ?? []
  const normalizedFields = normalized(sourceFields)
  const mapping = {}
  for (const target of [...SHEET_FIELDS[type].required, ...SHEET_FIELDS[type].optional]) {
    const aliases = SHEET_FIELDS[type].aliases[target] ?? [target]
    const index = normalizedFields.findIndex((field) => aliases.includes(field))
    if (index >= 0) mapping[target] = sourceFields[index]
  }
  return mapping
}

export function mapColumns(parsed, mapping) {
  const canonical = (target) => target === 'score' ? 'partial_marks' : target
  const fields = Object.entries(mapping).filter(([, source]) => source).map(([target]) => canonical(target))
  const data = (parsed.data ?? []).map((row) => Object.fromEntries(
    Object.entries(mapping).filter(([, source]) => source).map(([target, source]) => [canonical(target), row[source] ?? '']),
  ))
  return { data, errors: parsed.errors ?? [], meta: { ...parsed.meta, fields } }
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
