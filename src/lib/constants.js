// Canonical vocabulary. Input CSVs must use exactly these names.
export const DIMENSIONS = ['Recall', 'Comprehend', 'Solve', 'Build', 'Evaluate']
// A question is either an assignment or an assessment; reuse across exams is
// matched on (type, id).
export const QUESTION_TYPES = ['assignment', 'assessment']
// Optional refinement of a question. `mcq` (assessments only) means the scores file
// holds the option each student chose; more subtypes can be added here.
export const QUESTION_SUBTYPES = ['mcq']
export const DIFFICULTIES = ['beginner', 'easy', 'medium', 'hard', 'challenge']

// Used only for questions whose CSV row has no expected_solve_rate.
export const DEFAULT_EXPECTED_SOLVE_RATES = {
  beginner: 85,
  easy: 75,
  medium: 55,
  hard: 35,
  challenge: 20,
}

// Separates multiple dimensions or topics inside one CSV cell.
export const LIST_SEPARATOR = ';'
