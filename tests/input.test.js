import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readExamConfig, readScores, readStudentNames, readDataset } from '../src/lib/input.js'
import { CONFIG_CSV, SCORES_CSV, STUDENTS_CSV, parse } from './fixtures.js'

const configWith = (rows) =>
  `question_id,question_type,question_difficulty,question_dimension,question_topics,marks,expected_solve_rate\n${rows}\n`

const readConfig = async (text) => readExamConfig(await parse(text))
const hasError = (result, fragment) =>
  result.errors.some((e) => e.toLowerCase().includes(fragment.toLowerCase()))

describe('readExamConfig', () => {
  it('parses the canonical format', async () => {
    const { questions, errors } = await readConfig(CONFIG_CSV)
    assert.deepEqual(errors, [])
    assert.equal(questions.length, 3)
    assert.deepEqual(questions[1], {
      id: 'Q2',
      type: 'MCQ',
      difficulty: 'medium',
      dimensions: ['Recall', 'Comprehend'],
      topics: ['Arrays', 'Sorting'],
      marks: 4,
      expectedSolveRate: null,
    })
    assert.equal(questions[0].expectedSolveRate, 80)
  })

  it('accepts a file without the optional expected_solve_rate column', async () => {
    const text = 'question_id,question_type,question_difficulty,question_dimension,question_topics,marks\nQ1,MCQ,easy,Recall,Arrays,2\n'
    const { questions, errors } = await readConfig(text)
    assert.deepEqual(errors, [])
    assert.equal(questions[0].expectedSolveRate, null)
  })

  it('matches column headers and enumerated values case-insensitively', async () => {
    const text = 'Question_ID, Question_Type ,QUESTION_DIFFICULTY,question_dimension,question_topics,marks\nQ1,MCQ,Easy,recall,Arrays,2\n'
    const { questions, errors } = await readConfig(text)
    assert.deepEqual(errors, [])
    assert.equal(questions[0].difficulty, 'easy')
    assert.deepEqual(questions[0].dimensions, ['Recall'])
  })

  it('rejects a file missing a required column', async () => {
    const text = 'question_id,question_type,question_difficulty,question_dimension,marks\nQ1,MCQ,easy,Recall,2\n'
    const result = await readConfig(text)
    assert.ok(hasError(result, 'question_topics'))
  })

  it('rejects abbreviated or unknown dimensions', async () => {
    for (const dim of ['R', 'Banana', 'Recall;Xyz']) {
      const result = await readConfig(configWith(`Q1,MCQ,easy,${dim},Arrays,2,`))
      assert.ok(hasError(result, 'dimension'), `expected dimension error for ${dim}`)
    }
  })

  it('rejects a repeated dimension within one question', async () => {
    const result = await readConfig(configWith('Q1,MCQ,easy,Recall;Recall,Arrays,2,'))
    assert.ok(hasError(result, 'dimension'))
  })

  it('rejects an unknown difficulty', async () => {
    const result = await readConfig(configWith('Q1,MCQ,impossible,Recall,Arrays,2,'))
    assert.ok(hasError(result, 'difficulty'))
  })

  it('rejects invalid marks', async () => {
    for (const marks of ['0', '-1', 'abc', '']) {
      const result = await readConfig(configWith(`Q1,MCQ,easy,Recall,Arrays,${marks},`))
      assert.ok(hasError(result, 'marks'), `expected marks error for "${marks}"`)
    }
  })

  it('requires expected_solve_rate to be a percentage between 0 and 100 when present', async () => {
    for (const rate of ['120', '-5', 'high']) {
      const result = await readConfig(configWith(`Q1,MCQ,easy,Recall,Arrays,2,${rate}`))
      assert.ok(hasError(result, 'expected_solve_rate'), `expected rate error for "${rate}"`)
    }
    const fraction = await readConfig(configWith('Q1,MCQ,easy,Recall,Arrays,2,0.5'))
    assert.equal(fraction.questions[0].expectedSolveRate, 0.5, 'values are percentages, never rescaled')
  })

  it('rejects empty topics, empty type and duplicate question ids', async () => {
    assert.ok(hasError(await readConfig(configWith('Q1,MCQ,easy,Recall,,2,')), 'question_topics'))
    assert.ok(hasError(await readConfig(configWith('Q1,,easy,Recall,Arrays,2,')), 'question_type'))
    assert.ok(hasError(await readConfig(configWith('Q1,MCQ,easy,Recall,Arrays,2,\nq1,MCQ,easy,Recall,Arrays,2,')), 'duplicate'))
  })

  it('rejects a file with no questions', async () => {
    const result = await readConfig(configWith('').trim() + '\n')
    assert.ok(result.errors.length > 0)
  })

  it('reports the data row number of the offending row', async () => {
    const result = await readConfig(configWith('Q1,MCQ,easy,Recall,Arrays,2,\nQ2,MCQ,easy,Bad,Arrays,2,'))
    assert.ok(result.errors.some((e) => e.includes('row 2')))
  })
})

describe('readScores', () => {
  const questionsPromise = readConfig(CONFIG_CSV).then((r) => r.questions)

  it('parses wide format: blank is unattempted, zero is attempted', async () => {
    const questions = await questionsPromise
    const { students, errors } = readScores(await parse(SCORES_CSV), questions)
    assert.deepEqual(errors, [])
    assert.deepEqual(students.map((s) => s.id), ['S1', 'S2', 'S3'])
    assert.deepEqual(students[2].scores, { Q1: 0, Q3: 0 })
    assert.deepEqual(students[0].scores, { Q1: 2, Q2: 4, Q3: 10 })
  })

  it('preserves the row order of student ids even when they look numeric', async () => {
    const questions = await questionsPromise
    const text = 'student_id,Q1,Q2,Q3\n20,1,1,1\n3,1,1,1\n100,1,1,1\n'
    const { students } = readScores(await parse(text), questions)
    assert.deepEqual(students.map((s) => s.id), ['20', '3', '100'])
  })

  it('rejects when the first column is not student_id', async () => {
    const questions = await questionsPromise
    const result = readScores(await parse('id,Q1,Q2,Q3\nS1,1,1,1\n'), questions)
    assert.ok(hasError(result, 'student_id'))
  })

  it('rejects score columns that are not in the exam config', async () => {
    const questions = await questionsPromise
    const result = readScores(await parse('student_id,Q1,Q2,Q3,Q9\nS1,1,1,1,1\n'), questions)
    assert.ok(hasError(result, 'Q9'))
  })

  it('rejects when an exam config question has no score column', async () => {
    const questions = await questionsPromise
    const result = readScores(await parse('student_id,Q1,Q2\nS1,1,1\n'), questions)
    assert.ok(hasError(result, 'Q3'))
  })

  it('rejects non-numeric, negative and over-maximum scores', async () => {
    const questions = await questionsPromise
    for (const [cell, fragment] of [['abc', 'not a number'], ['NA', 'not a number'], ['-1', 'negative'], ['2.5', 'exceeds']]) {
      const result = readScores(await parse(`student_id,Q1,Q2,Q3\nS1,${cell},1,1\n`), questions)
      assert.ok(hasError(result, fragment), `expected "${fragment}" for ${cell}`)
    }
  })

  it('accepts decimal partial credit up to the maximum', async () => {
    const questions = await questionsPromise
    const { students, errors } = readScores(await parse('student_id,Q1,Q2,Q3\nS1,1.5,3.25,9.5\n'), questions)
    assert.deepEqual(errors, [])
    assert.equal(students[0].scores.Q2, 3.25)
  })

  it('rejects duplicate and blank student ids', async () => {
    const questions = await questionsPromise
    assert.ok(hasError(readScores(await parse('student_id,Q1,Q2,Q3\nS1,1,1,1\nS1,1,1,1\n'), questions), 'duplicate'))
    assert.ok(hasError(readScores(await parse('student_id,Q1,Q2,Q3\n,1,1,1\n'), questions), 'student_id'))
  })

  it('rejects a file with no student rows', async () => {
    const questions = await questionsPromise
    const result = readScores(await parse('student_id,Q1,Q2,Q3\n'), questions)
    assert.ok(result.errors.length > 0)
  })

  it('treats student ids as case-sensitive', async () => {
    const questions = await questionsPromise
    const { students, errors } = readScores(await parse('student_id,Q1,Q2,Q3\nS1,1,1,1\ns1,1,1,1\n'), questions)
    assert.deepEqual(errors, [])
    assert.equal(students.length, 2)
  })
})

describe('readStudentNames', () => {
  it('parses student_id and student_name', async () => {
    const { names, errors } = readStudentNames(await parse(STUDENTS_CSV))
    assert.deepEqual(errors, [])
    assert.deepEqual(names, { S1: 'Alice', S2: 'Bob', S3: 'Cara' })
  })

  it('rejects missing columns, blank names and duplicate ids', async () => {
    assert.ok(hasError(readStudentNames(await parse('student_id,name\nS1,Alice\n')), 'student_name'))
    assert.ok(hasError(readStudentNames(await parse('student_id,student_name\nS1,\n')), 'student_name'))
    assert.ok(hasError(readStudentNames(await parse('student_id,student_name\nS1,A\nS1,B\n')), 'duplicate'))
  })

  it('ignores extra columns with a warning', async () => {
    const { names, errors, warnings } = readStudentNames(await parse('student_id,student_name,email\nS1,Alice,a@x.edu\n'))
    assert.deepEqual(errors, [])
    assert.equal(names.S1, 'Alice')
    assert.ok(warnings.some((w) => w.includes('email')))
  })
})

describe('readDataset', () => {
  it('combines the three files into one dataset', async () => {
    const { dataset, errors } = readDataset({
      config: await parse(CONFIG_CSV),
      scores: await parse(SCORES_CSV),
      students: await parse(STUDENTS_CSV),
    })
    assert.deepEqual(errors, [])
    assert.equal(dataset.questions.length, 3)
    assert.deepEqual(dataset.students.map((s) => [s.id, s.name]), [['S1', 'Alice'], ['S2', 'Bob'], ['S3', 'Cara']])
    assert.deepEqual(dataset.students[0].scores, { Q1: 2, Q2: 4, Q3: 10 })
  })

  it('uses the student id as the name when no student file is given', async () => {
    const { dataset } = readDataset({ config: await parse(CONFIG_CSV), scores: await parse(SCORES_CSV), students: null })
    assert.equal(dataset.students[0].name, 'S1')
  })

  it('rejects when a scored student is missing from the student file', async () => {
    const result = readDataset({
      config: await parse(CONFIG_CSV),
      scores: await parse(SCORES_CSV),
      students: await parse('student_id,student_name\nS1,Alice\nS2,Bob\n'),
    })
    assert.equal(result.dataset, null)
    assert.ok(hasError(result, 'S3'))
  })

  it('warns, but still accepts, student file rows with no scores', async () => {
    const result = readDataset({
      config: await parse(CONFIG_CSV),
      scores: await parse(SCORES_CSV),
      students: await parse(`${STUDENTS_CSV}S9,Zed\n`),
    })
    assert.deepEqual(result.errors, [])
    assert.ok(result.warnings.some((w) => w.includes('S9')))
  })

  it('returns no dataset and the errors of every file when any file is invalid', async () => {
    const result = readDataset({
      config: await parse(configWith('Q1,MCQ,easy,Bad,Arrays,2,')),
      scores: await parse('student_id,Q1\nS1,1\n'),
      students: null,
    })
    assert.equal(result.dataset, null)
    assert.ok(result.errors.length >= 1)
  })
})
