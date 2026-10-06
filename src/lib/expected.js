import { DEFAULT_EXPECTED_SOLVE_RATES } from './constants.js'

// The single rule for a question's expected solve rate, used by both the
// solve-rate analysis and the simulation: the CSV value when present,
// otherwise the default for the question's difficulty tier.
export function resolveExpectedSolveRate(question) {
  if (question.expectedSolveRate != null) return { ratePct: question.expectedSolveRate, source: 'csv' }
  return { ratePct: DEFAULT_EXPECTED_SOLVE_RATES[question.difficulty], source: 'difficulty-default' }
}
