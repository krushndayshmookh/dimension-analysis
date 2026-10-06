import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readAttendance, readExamConfig, readScores, readStudentNames, readDataset } from '../src/lib/input.js'
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

  it('gives the cohort as a list in file order', async () => {
    const { students } = readStudentNames(await parse('student_id,student_name,section\nS2,Bob,B\nS1,Alice,\n'))
    assert.deepEqual(students, [{ id: 'S2', name: 'Bob', section: 'B' }, { id: 'S1', name: 'Alice', section: null }])
  })

  it('no longer takes attendance: that is a file of its own, per exam', async () => {
    const { warnings } = readStudentNames(await parse('student_id,student_name,attendance\nS1,Alice,absent\n'))
    assert.ok(warnings.some((w) => w.includes('attendance')))
  })
})

const cohortOf = async (csv = STUDENTS_CSV) => readStudentNames(await parse(csv)).students
const readAll = async ({ config = CONFIG_CSV, scores = SCORES_CSV, cohort, attendance = null } = {}) =>
  readDataset({
    config: await parse(config),
    scores: await parse(scores),
    cohort: cohort === undefined ? await cohortOf() : cohort,
    attendance: attendance === null ? null : await parse(attendance),
  })

describe('readDataset', () => {
  it('combines the exam files with the cohort into one dataset', async () => {
    const { dataset, errors, warnings } = await readAll()
    assert.deepEqual(errors, [])
    assert.deepEqual(warnings, [])
    assert.equal(dataset.questions.length, 3)
    assert.deepEqual(dataset.students.map((s) => [s.id, s.name, s.section, s.absent]), [['S1', 'Alice', 'A', false], ['S2', 'Bob', 'A', false], ['S3', 'Cara', 'B', false]])
    assert.deepEqual(dataset.students[0].scores, { Q1: 2, Q2: 4, Q3: 10 })
  })

  it('needs a cohort', async () => {
    const result = await readAll({ cohort: null })
    assert.equal(result.dataset, null)
    assert.ok(hasError(result, 'cohort'))
  })

  it('rejects scored students who are not in the cohort, and lists them', async () => {
    const result = await readAll({ cohort: await cohortOf('student_id,student_name\nS1,Alice\nS2,Bob\n') })
    assert.equal(result.dataset, null)
    assert.ok(hasError(result, 'S3'))
    assert.ok(hasError(result, 'not in the cohort'))
  })

  it('counts cohort students with no row in the scores file as absent, with no scores', async () => {
    const cohort = await cohortOf(`${STUDENTS_CSV}S9,Zed,C\n`)
    const { dataset, errors, warnings } = await readAll({ cohort })
    assert.deepEqual(errors, [])
    const zed = dataset.students.find((s) => s.id === 'S9')
    assert.deepEqual([zed.absent, zed.scores, zed.name, zed.section], [true, {}, 'Zed', 'C'])
    assert.equal(dataset.students.length, 4, 'the whole cohort is in the exam')
    assert.ok(warnings.some((w) => w.includes('S9') && /absent/i.test(w)))
  })

  it('returns no dataset and the errors of every file when any file is invalid', async () => {
    const result = await readAll({ config: configWith('Q1,assessment,easy,Bad,Arrays,2,'), scores: 'student_id,Q1\nS1,1\n' })
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
    const result = await readAll({
      config: mcqConfig('Q1,assessment,easy,Recall,Arrays,2,mcq,B\nQ2,assignment,hard,Solve,Sorting,10,,'),
      scores: 'student_id,Q1,Q2\nS1,B,7\nS2,C,\n',
      cohort: await cohortOf('student_id,student_name\nS1,A\nS2,B\n'),
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

describe('readAttendance', () => {
  const read = async (text) => readAttendance(await parse(text))

  it('reads present and absent, ignoring case and spaces; blank means present', async () => {
    const { absent, errors } = await read('student_id,attendance\nS1,Present\nS2, ABSENT \nS3,\n')
    assert.deepEqual(errors, [])
    assert.deepEqual(absent, { S1: false, S2: true, S3: false })
  })

  it('needs both columns and rejects other values and duplicate students', async () => {
    assert.ok(hasError(await read('student_id,status\nS1,absent\n'), 'attendance'))
    assert.ok(hasError(await read('student_id,attendance\nS1,late\n'), 'late'))
    assert.ok(hasError(await read('student_id,attendance\nS1,absent\nS1,present\n'), 'duplicate'))
    assert.ok(hasError(await read('student_id,attendance\n,absent\n'), 'student_id'))
  })
})

describe('attendance in the dataset', () => {
  it('flags the students the attendance file marks absent', async () => {
    const { dataset, errors } = await readAll({ attendance: 'student_id,attendance\nS2,absent\nS1,present\n' })
    assert.deepEqual(errors, [])
    assert.deepEqual(dataset.students.map((s) => s.absent), [false, true, false])
  })

  it('treats everyone with a scores row as present when there is no attendance file', async () => {
    const { dataset } = await readAll()
    assert.ok(dataset.students.every((s) => s.absent === false))
  })

  it('rejects an attendance row for a student who is not in the cohort', async () => {
    const result = await readAll({ attendance: 'student_id,attendance\nS9,absent\n' })
    assert.equal(result.dataset, null)
    assert.ok(hasError(result, 'S9'))
  })

  it('ignores the scores of a student marked absent, and says so', async () => {
    const { dataset, errors, warnings } = await readAll({ attendance: 'student_id,attendance\nS2,absent\nS3,absent\n' })
    assert.deepEqual(errors, [])
    assert.deepEqual(dataset.students.map((s) => Object.keys(s.scores).length), [3, 0, 0])
    assert.ok(warnings.some((w) => w.includes('S2') && /absent/i.test(w) && /ignored/i.test(w)), warnings.join('|'))
    assert.ok(!warnings.some((w) => w.includes('S1')))
  })

  it('lets an explicit "present" stand even when the student has no scores row', async () => {
    const cohort = await cohortOf(`${STUDENTS_CSV}S9,Zed,C\n`)
    const { dataset } = await readAll({ cohort, attendance: 'student_id,attendance\nS9,present\n' })
    const zed = dataset.students.find((s) => s.id === 'S9')
    assert.deepEqual([zed.absent, zed.scores], [false, {}])
  })

  it('does not mention an absent student who has no scores', async () => {
    const cohort = await cohortOf(`${STUDENTS_CSV}S9,Zed,C\n`)
    const { warnings } = await readAll({ cohort })
    assert.ok(!warnings.some((w) => /ignored/i.test(w)))
  })
})
