import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readExamConfig, readScores, readStudentNames, readDataset } from '../src/lib/input.js'
import { CONFIG_CSV, SCORES_CSV, STUDENTS_CSV, parse } from './fixtures.js'

const configWith = (rows) =>
  `question_id,question_type,question_difficulty,question_dimension,question_topics,marks,expected_solve_rate,correct_option\n${rows}\n`

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
      type: 'assessment',
      difficulty: 'medium',
      dimensions: ['Recall', 'Comprehend'],
      topics: ['Arrays', 'Sorting'],
      marks: 4,
      expectedSolveRate: null,
      subtype: null,
      correctOption: null,
    })
    assert.equal(questions[0].expectedSolveRate, 80)
  })

  it('accepts a file without the optional expected_solve_rate column', async () => {
    const text = 'question_id,question_type,question_difficulty,question_dimension,question_topics,marks\nQ1,assessment,easy,Recall,Arrays,2\n'
    const { questions, errors } = await readConfig(text)
    assert.deepEqual(errors, [])
    assert.equal(questions[0].expectedSolveRate, null)
  })

  it('matches column headers and enumerated values case-insensitively', async () => {
    const text = 'Question_ID, Question_Type ,QUESTION_DIFFICULTY,question_dimension,question_topics,marks\nQ1,Assessment,Easy,recall,Arrays,2\n'
    const { questions, errors } = await readConfig(text)
    assert.deepEqual(errors, [])
    assert.equal(questions[0].difficulty, 'easy')
    assert.deepEqual(questions[0].dimensions, ['Recall'])
  })

  it('rejects a file missing a required column', async () => {
    const text = 'question_id,question_type,question_difficulty,question_dimension,question_topics\nQ1,assessment,easy,Recall,Arrays\n'
    const result = await readConfig(text)
    assert.ok(hasError(result, 'marks'))
  })

  it('treats topics as optional: no column, or a blank cell, means no topics', async () => {
    const noColumn = await readConfig('question_id,question_type,question_difficulty,question_dimension,marks\nQ1,assessment,easy,Recall,2\n')
    assert.deepEqual(noColumn.errors, [])
    assert.deepEqual(noColumn.questions[0].topics, [])
    const blank = await readConfig(configWith('Q1,assessment,easy,Recall,,2,,\nQ2,assessment,easy,Recall, Arrays ,2,,'))
    assert.deepEqual(blank.errors, [])
    assert.deepEqual(blank.questions.map((q) => q.topics), [[], ['Arrays']])
  })

  it('still rejects an empty entry inside a topic list', async () => {
    assert.ok(hasError(await readConfig(configWith('Q1,assessment,easy,Recall,Arrays;;Sorting,2,,')), 'question_topics'))
  })

  it('rejects abbreviated or unknown dimensions', async () => {
    for (const dim of ['R', 'Banana', 'Recall;Xyz']) {
      const result = await readConfig(configWith(`Q1,assessment,easy,${dim},Arrays,2,`))
      assert.ok(hasError(result, 'dimension'), `expected dimension error for ${dim}`)
    }
  })

  it('rejects a repeated dimension within one question', async () => {
    const result = await readConfig(configWith('Q1,assessment,easy,Recall;Recall,Arrays,2,'))
    assert.ok(hasError(result, 'dimension'))
  })

  it('rejects an unknown difficulty', async () => {
    const result = await readConfig(configWith('Q1,assessment,impossible,Recall,Arrays,2,'))
    assert.ok(hasError(result, 'difficulty'))
  })

  it('rejects invalid marks', async () => {
    for (const marks of ['0', '-1', 'abc', '']) {
      const result = await readConfig(configWith(`Q1,assessment,easy,Recall,Arrays,${marks},`))
      assert.ok(hasError(result, 'marks'), `expected marks error for "${marks}"`)
    }
  })

  it('requires expected_solve_rate to be a percentage between 0 and 100 when present', async () => {
    for (const rate of ['120', '-5', 'high']) {
      const result = await readConfig(configWith(`Q1,assessment,easy,Recall,Arrays,2,${rate}`))
      assert.ok(hasError(result, 'expected_solve_rate'), `expected rate error for "${rate}"`)
    }
    const fraction = await readConfig(configWith('Q1,assessment,easy,Recall,Arrays,2,0.5'))
    assert.equal(fraction.questions[0].expectedSolveRate, 0.5, 'values are percentages, never rescaled')
  })

  it('only accepts the question types assignment and assessment, case-insensitively', async () => {
    for (const type of ['assignment', 'assessment', 'Assignment', 'ASSESSMENT']) {
      const { questions, errors } = await readConfig(configWith(`Q1,${type},easy,Recall,Arrays,2,,`))
      assert.deepEqual(errors, [], type)
      assert.equal(questions[0].type, type.toLowerCase())
    }
    for (const type of ['MCQ', 'Coding', 'quiz', '']) {
      assert.ok(hasError(await readConfig(configWith(`Q1,${type},easy,Recall,Arrays,2,,`)), 'question_type'), `rejects "${type}"`)
    }
  })

  it('rejects duplicate question ids', async () => {
    assert.ok(hasError(await readConfig(configWith('Q1,assessment,easy,Recall,Arrays,2,\nq1,assessment,easy,Recall,Arrays,2,')), 'duplicate'))
  })

  it('rejects a file with no questions', async () => {
    const result = await readConfig(configWith('').trim() + '\n')
    assert.ok(result.errors.length > 0)
  })

  it('reports the data row number of the offending row', async () => {
    const result = await readConfig(configWith('Q1,assessment,easy,Recall,Arrays,2,\nQ2,assessment,easy,Bad,Arrays,2,'))
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
    assert.ok(!warnings.some((w) => w.includes('section')))
  })

  it('reads the optional section column; blank means no section', async () => {
    const { names, sections, errors } = readStudentNames(await parse('student_id,student_name,section\nS1,Alice, A \nS2,Bob,\n'))
    assert.deepEqual(errors, [])
    assert.deepEqual(names, { S1: 'Alice', S2: 'Bob' })
    assert.deepEqual(sections, { S1: 'A', S2: null })
  })

  it('has no sections when the column is absent', async () => {
    const { sections } = readStudentNames(await parse('student_id,student_name\nS1,Alice\n'))
    assert.deepEqual(sections, { S1: null })
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
    assert.deepEqual(dataset.students.map((s) => [s.id, s.name, s.section]), [['S1', 'Alice', 'A'], ['S2', 'Bob', 'A'], ['S3', 'Cara', 'B']])
    assert.deepEqual(dataset.students[0].scores, { Q1: 2, Q2: 4, Q3: 10 })
  })

  it('uses the student id as the name when no student file is given', async () => {
    const { dataset } = readDataset({ config: await parse(CONFIG_CSV), scores: await parse(SCORES_CSV), students: null })
    assert.equal(dataset.students[0].name, 'S1')
    assert.equal(dataset.students[0].section, null)
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
      students: await parse(`${STUDENTS_CSV}S9,Zed,C\n`),
    })
    assert.deepEqual(result.errors, [])
    assert.ok(result.warnings.some((w) => w.includes('S9')))
  })

  it('returns no dataset and the errors of every file when any file is invalid', async () => {
    const result = readDataset({
      config: await parse(configWith('Q1,assessment,easy,Bad,Arrays,2,')),
      scores: await parse('student_id,Q1\nS1,1\n'),
      students: null,
    })
    assert.equal(result.dataset, null)
    assert.ok(result.errors.length >= 1)
  })
})

// ---- multiple-choice questions ---------------------------------------------------------

const mcqConfig = (rows) =>
  `question_id,question_type,question_difficulty,question_dimension,question_topics,marks,question_subtype,correct_option\n${rows}\n`

describe('readExamConfig: question_subtype and correct_option', () => {
  it('reads an mcq question with its answer key, upper-cased', async () => {
    const { questions, errors } = await readConfig(mcqConfig('Q1,assessment,easy,Recall,Arrays,2,mcq,b\nQ2,assignment,easy,Recall,Arrays,5,,'))
    assert.deepEqual(errors, [])
    assert.deepEqual(questions.map((q) => [q.subtype, q.correctOption]), [['mcq', 'B'], [null, null]])
  })

  it('accepts the subtype in any case', async () => {
    const { questions, errors } = await readConfig(mcqConfig('Q1,assessment,easy,Recall,Arrays,2,MCQ,A'))
    assert.deepEqual(errors, [])
    assert.equal(questions[0].subtype, 'mcq')
  })

  it('rejects unknown subtypes', async () => {
    assert.ok(hasError(await readConfig(mcqConfig('Q1,assessment,easy,Recall,Arrays,2,quiz,')), 'question_subtype'))
  })

  it('only allows mcq for assessments', async () => {
    assert.ok(hasError(await readConfig(mcqConfig('Q1,assignment,easy,Recall,Arrays,2,mcq,A')), 'assessment'))
  })

  it('requires a correct_option for an mcq question, and only for an mcq question', async () => {
    assert.ok(hasError(await readConfig(mcqConfig('Q1,assessment,easy,Recall,Arrays,2,mcq,')), 'correct_option'))
    assert.ok(hasError(await readConfig(mcqConfig('Q1,assessment,easy,Recall,Arrays,2,,B')), 'correct_option'))
    assert.ok(hasError(await readConfig(mcqConfig('Q1,assessment,easy,Recall,Arrays,2,mcq,B C')), 'correct_option'))
  })

  it('does not need either column', async () => {
    const { questions, errors } = await readConfig(CONFIG_CSV)
    assert.deepEqual(errors, [])
    assert.ok(questions.every((q) => q.subtype === null && q.correctOption === null))
  })
})

describe('readScores: multiple-choice cells hold the chosen option', () => {
  const configPromise = readConfig(mcqConfig('Q1,assessment,easy,Recall,Arrays,2,mcq,B\nQ2,assignment,hard,Solve,Sorting,10,,')).then((r) => r.questions)
  const read = async (text) => readScores(await parse(text), await configPromise)

  it('scores an mcq cell as full marks for the key and zero for any other option', async () => {
    const { students, errors } = await read('student_id,Q1,Q2\nS1,B,7\nS2,c,\nS3,,3.5\n')
    assert.deepEqual(errors, [])
    assert.deepEqual(students.map((s) => s.scores), [{ Q1: 2, Q2: 7 }, { Q1: 0 }, { Q2: 3.5 }])
  })

  it('keeps the chosen options, upper-cased, for the mcq questions only', async () => {
    const { students } = await read('student_id,Q1,Q2\nS1,B,7\nS2,c,\nS3,,3.5\n')
    assert.deepEqual(students.map((s) => s.answers), [{ Q1: 'B' }, { Q1: 'C' }, {}])
  })

  it('treats a blank mcq cell as unattempted', async () => {
    const { students } = await read('student_id,Q1,Q2\nS3,,3.5\n')
    assert.ok(!('Q1' in students[0].scores))
  })

  it('rejects an mcq cell that is not a short option label', async () => {
    assert.ok(hasError(await read('student_id,Q1,Q2\nS1,"B, C",7\n'), 'option'))
    assert.ok(hasError(await read('student_id,Q1,Q2\nS1,B or C,7\n'), 'option'))
  })

  it('still validates numeric cells for the other questions', async () => {
    assert.ok(hasError(await read('student_id,Q1,Q2\nS1,B,abc\n'), 'not a number'))
    assert.ok(hasError(await read('student_id,Q1,Q2\nS1,B,11\n'), 'exceeds'))
  })

  it('leaves out answers when there are no mcq questions', async () => {
    const { students } = readScores(await parse(SCORES_CSV), (await readConfig(CONFIG_CSV)).questions)
    assert.ok(students.every((s) => !('answers' in s)))
  })

  it('carries the chosen options into the dataset', async () => {
    const result = readDataset({
      config: await parse(mcqConfig('Q1,assessment,easy,Recall,Arrays,2,mcq,B\nQ2,assignment,hard,Solve,Sorting,10,,')),
      scores: await parse('student_id,Q1,Q2\nS1,B,7\nS2,C,\n'),
      students: null,
    })
    assert.deepEqual(result.errors, [])
    assert.deepEqual(result.dataset.students.map((s) => s.answers), [{ Q1: 'B' }, { Q1: 'C' }])
    assert.deepEqual(result.dataset.students[0].scores, { Q1: 2, Q2: 7 })
  })

  it('has no separate answers file any more', async () => {
    const module = await import('../src/lib/input.js')
    assert.ok(!('readAnswers' in module))
  })
})

describe('attendance in the student file', () => {
  const read = async (text) => readStudentNames(await parse(text))

  it('reads the optional attendance column; blank means present', async () => {
    const { absent, errors, warnings } = await read('student_id,student_name,attendance\nS1,Alice,Present\nS2,Bob, ABSENT \nS3,Cara,\n')
    assert.deepEqual(errors, [])
    assert.deepEqual(absent, { S1: false, S2: true, S3: false })
    assert.ok(!warnings.some((w) => w.includes('attendance')))
  })

  it('treats every student as present when the column is absent', async () => {
    assert.deepEqual((await read('student_id,student_name\nS1,Alice\n')).absent, { S1: false })
  })

  it('rejects any other value', async () => {
    const { errors } = await read('student_id,student_name,attendance\nS1,Alice,late\n')
    assert.ok(errors.some((e) => e.includes('S1') && e.includes('attendance') && e.includes('late')), errors.join('|'))
  })

  it('puts the flag on the dataset students', async () => {
    const { dataset } = readDataset({
      config: await parse(CONFIG_CSV),
      scores: await parse(SCORES_CSV),
      students: await parse('student_id,student_name,attendance\nS1,Alice,present\nS2,Bob,absent\nS3,Cara,\n'),
    })
    assert.deepEqual(dataset.students.map((s) => s.absent), [false, true, false])
  })

  it('is false for everyone without a student file', async () => {
    const { dataset } = readDataset({ config: await parse(CONFIG_CSV), scores: await parse(SCORES_CSV), students: null })
    assert.ok(dataset.students.every((s) => s.absent === false))
  })
})

describe('absent students with scores', () => {
  const load = async () =>
    readDataset({
      config: await parse(CONFIG_CSV),
      scores: await parse(SCORES_CSV),
      students: await parse('student_id,student_name,attendance\nS1,Alice,present\nS2,Bob,absent\nS3,Cara,absent\n'),
    })

  it('ignores the scores of a student marked absent, and says so', async () => {
    const { dataset, errors, warnings } = await load()
    assert.deepEqual(errors, [])
    assert.deepEqual(dataset.students.map((s) => Object.keys(s.scores).length), [3, 0, 0])
    assert.ok(warnings.some((w) => w.includes('S2') && /absent/i.test(w) && /ignored/i.test(w)), warnings.join('|'))
    assert.ok(!warnings.some((w) => w.includes('S1')))
  })

  it('does not mention an absent student who has no scores', async () => {
    const { warnings } = await load()
    const text = warnings.filter((w) => w.includes('absent')).join(' ')
    assert.ok(text.includes('S2') && !text.includes('S3 '), text)
  })
})
