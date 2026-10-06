import { parseCsv } from '../src/lib/csv.js'
import { readDataset } from '../src/lib/input.js'
import { buildProfiles } from '../src/lib/profiles.js'
import { analyzePaper } from '../src/lib/paper.js'

// Three questions, three students. Hand-computed expectations in the tests
// are derived from these numbers.
//
// Q1 easy   Recall               2 marks  topics Arrays            expected 80
// Q2 medium Recall;Comprehend    4 marks  topics Arrays;Sorting    expected (none)
// Q3 hard   Solve                10 marks topics Sorting           expected 30
// Total 16 marks.
export const CONFIG_CSV = `question_id,question_type,question_difficulty,question_dimension,question_topics,marks,expected_solve_rate
Q1,MCQ,easy,Recall,Arrays,2,80
Q2,MCQ,medium,Recall;Comprehend,Arrays;Sorting,4,
Q3,Coding,hard,Solve,Sorting,10,30
`

export const SCORES_CSV = `student_id,Q1,Q2,Q3
S1,2,4,10
S2,2,0,5
S3,0,,0
`

export const STUDENTS_CSV = `student_id,student_name
S1,Alice
S2,Bob
S3,Cara
`

export const parse = (text) => parseCsv(text)

export async function loadDataset(config = CONFIG_CSV, scores = SCORES_CSV, students = STUDENTS_CSV) {
  const result = readDataset({
    config: await parse(config),
    scores: await parse(scores),
    students: students === null ? null : await parse(students),
  })
  if (result.errors.length) throw new Error(`fixture invalid: ${result.errors.join('; ')}`)
  return result.dataset
}

export async function loadAnalysis() {
  const dataset = await loadDataset()
  const profiles = buildProfiles(dataset)
  const paper = analyzePaper(dataset, profiles)
  return { dataset, profiles, paper }
}

export const closeTo = (actual, expected, tolerance = 0.011) =>
  Math.abs(actual - expected) <= tolerance
