// Canonical vocabulary. Input CSVs must use exactly these names.
export const DIMENSIONS = ['Recall', 'Comprehend', 'Solve', 'Build', 'Evaluate']
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
