import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readListing } from '../src/lib/convert/listing.js'
import { readCoding } from '../src/lib/convert/coding.js'
import { readQuiz } from '../src/lib/convert/quiz.js'
import { readEnrolled } from '../src/lib/convert/enrolled.js'
import { assembleExam, attendanceTable, configTable, scoresTable, studentsTable, extraToConfig } from '../src/lib/convert/assemble.js'
import { readAttendance, readDataset, readStudentNames } from '../src/lib/input.js'
import { parse } from './fixtures.js'

const LISTING = `Question ID,Type,Set,Difficulty,Dimensions,Topics,ComprehensionID,Solve Rate
10,Assessment,D,EASY,Recall,HTTP 1,,90
11,Assessment,D,MED,Comprehension;Evaluate,NPM,,
12,Assessment,A,EASY,Recall,HTTP,,
20,Assignment,D,HARD,Build,Express 5,,35
21,Assignment,A,HARD,Build,Express,,
22,Assignment,D,EASY,Solve,Express,,
30,Assignment,,EASY,,,,
`
const CODING = `user_id,Student Name,question_id,Question Title,difficulty_type,Total Test Case,partial_marks,final_scaled_marks,Attendance
"1,001",Asha,20,Shortener,Hard,4,0.5,0.5,Present
"1,002",Bala,20,Shortener,Hard,4,1,1,Present
"1,003",Chitra,20,Shortener,Hard,4,0,0,Absent
`
const QUIZ = `user_id,question_id,question_no,difficulty_level,question_type,student_name,attempt_count,marks_contest,Attendance
"1,001",10,1,Easy,MCQ,Asha,1,4,Present
"1,001",11,2,Easy,MCQ,Asha,1,-1,Present
"1,002",10,1,Easy,MCQ,Bala,0,0,Present
"1,002",11,2,Easy,MCQ,Bala,1,4,Present
"1,003",10,1,Easy,MCQ,Chitra,0,0,Absent
"1,003",11,2,Easy,MCQ,Chitra,0,0,Absent
"1,009",10,1,Easy,MCQ,Dev,1,4,Present
"1,009",11,2,Easy,MCQ,Dev,1,4,Present
`
const ENROLLED = 'student_id,student_name,,\n1001,Asha K,,\n1002,Bala R,,\n1003,Chitra M,,\n1004,Esha N,,\n'

const load = async (which = ['listing', 'coding', 'quiz', 'enrolled']) => ({
  listing: which.includes('listing') ? readListing(await parse(LISTING)) : null,
  coding: which.includes('coding') ? readCoding(await parse(CODING)) : null,
  quiz: which.includes('quiz') ? readQuiz(await parse(QUIZ)) : null,
  enrolled: which.includes('enrolled') ? readEnrolled(await parse(ENROLLED)) : null,
})
const TOTALS = { coding: 60, quiz: 40 }

describe('assembleExam: questions', () => {
  it('builds config rows from the sheets, filled in from the listing', async () => {
    const { config, set } = assembleExam({ ...(await load()), totalMarks: TOTALS })
    assert.equal(set, 'D')
    assert.deepEqual(
      config.map((r) => [r.question_id, r.question_type, r.question_difficulty, r.question_dimension, r.question_topics, r.marks, r.expected_solve_rate]),
      [
        ['10', 'assessment', 'easy', 'Recall', 'HTTP', 20, '90'],
        ['11', 'assessment', 'medium', 'Comprehend;Evaluate', 'NPM', 20, ''],
        ['20', 'assignment', 'hard', 'Build', 'Express', 60, '35'],
      ]
    )
  })

  it('divides each type’s total marks equally over its questions', async () => {
    const { config } = assembleExam({ ...(await load()), totalMarks: { coding: 60, quiz: 30 } })
    assert.deepEqual(config.map((r) => r.marks), [15, 15, 60])
  })

  it('converts one sheet on its own', async () => {
    const quizOnly = assembleExam({ ...(await load(['listing', 'quiz'])), totalMarks: TOTALS })
    assert.deepEqual(quizOnly.config.map((r) => r.question_id), ['10', '11'])
    const codingOnly = assembleExam({ ...(await load(['listing', 'coding'])), totalMarks: TOTALS })
    assert.deepEqual(codingOnly.config.map((r) => r.question_id), ['20'])
  })

  it('lists listing rows of the same set that are not in the score sheets, and rows without a set', async () => {
    const { extras } = assembleExam({ ...(await load()), totalMarks: TOTALS })
    assert.deepEqual(extras.map((r) => [r.question_id, r.reason]), [
      ['22', 'in set D but not in the score sheets'],
      ['30', 'has no set'],
    ])
  })

  it('adds a row to fill in for a sheet question missing from the listing', async () => {
    const parts = await load()
    parts.listing.questions = parts.listing.questions.filter((q) => q.id !== '11')
    const { config, issues } = assembleExam({ ...parts, totalMarks: TOTALS })
    const row = config.find((r) => r.question_id === '11')
    assert.deepEqual([row.question_type, row.question_difficulty, row.question_dimension, row.question_topics], ['assessment', 'easy', '', ''])
    assert.ok(row.problems.includes('not in the listing'))
    assert.ok(issues.some((i) => i.level === 'warning' && i.text.includes('11') && /not in the listing/.test(i.text)))
  })

  it('works without a listing, leaving the details to fill in', async () => {
    const { config } = assembleExam({ ...(await load(['quiz'])), totalMarks: TOTALS })
    assert.equal(config.length, 2)
    assert.ok(config.every((r) => r.problems.includes('not in the listing')))
  })

  it('warns when the listing says a question has the other type', async () => {
    const parts = await load()
    parts.listing.questions.find((q) => q.id === '20').type = 'assessment'
    const { config, issues } = assembleExam({ ...parts, totalMarks: TOTALS })
    assert.equal(config.find((r) => r.question_id === '20').question_type, 'assignment', 'the sheet decides')
    assert.ok(issues.some((i) => i.text.includes('20') && /type/i.test(i.text)))
  })

  it('carries the listing problems of a question into its row', async () => {
    const parts = await load()
    parts.listing.questions.find((q) => q.id === '10').problems = ['no topic']
    assert.deepEqual(assembleExam({ ...parts, totalMarks: TOTALS }).config[0].problems, ['no topic'])
  })

  it('warns when the sheets belong to different sets', async () => {
    const parts = await load()
    parts.listing.questions.find((q) => q.id === '20').set = 'A'
    const { issues } = assembleExam({ ...parts, totalMarks: TOTALS })
    assert.ok(issues.some((i) => /different sets/i.test(i.text)))
  })

  it('has no set when the listing has none', async () => {
    const parts = await load()
    parts.listing.questions.forEach((q) => (q.set = ''))
    assert.equal(assembleExam({ ...parts, totalMarks: TOTALS }).set, null)
  })
})

describe('assembleExam: students', () => {
  it('uses the enrolled names, and marks a student absent only if absent in every sheet they appear in', async () => {
    const parts = await load()
    parts.quiz.students.find((s) => s.id === '1002').absent = true
    const { students } = assembleExam({ ...parts, totalMarks: TOTALS })
    assert.deepEqual(students.map((s) => [s.id, s.name, s.absent]), [
      ['1001', 'Asha K', false],
      ['1002', 'Bala R', false],
      ['1003', 'Chitra M', true],
      ['1009', 'Dev', false],
      ['1004', 'Esha N', true],
    ])
  })

  it('keeps enrolled students who are in no score sheet in the cohort as absent, and says so', async () => {
    const { students, issues } = assembleExam({ ...(await load()), totalMarks: TOTALS })
    assert.deepEqual(students.find((s) => s.id === '1004'), { id: '1004', name: 'Esha N', absent: true, inSheets: false })
    assert.ok(students.filter((s) => s.id !== '1004').every((s) => s.inSheets))
    assert.ok(issues.some((i) => i.text.includes('1004') && /enrolled/i.test(i.text) && /absent/i.test(i.text)))
  })

  it('notes scored students who are not enrolled, keeping the name from the sheet', async () => {
    const { students, issues } = assembleExam({ ...(await load()), totalMarks: TOTALS })
    assert.equal(students.find((s) => s.id === '1009').name, 'Dev')
    assert.ok(issues.some((i) => i.text.includes('1009') && /not in the enrolled/i.test(i.text)))
  })

  it('covers a student who is in only one of the sheets', async () => {
    const parts = await load()
    const { students, fractions } = assembleExam({ ...parts, totalMarks: TOTALS })
    assert.ok(students.some((s) => s.id === '1009'))
    assert.deepEqual(fractions['1009'], { 10: 1, 11: 1 })
  })
})

describe('tables', () => {
  it('writes scores as the fraction earned times the question’s marks, blank when unattempted', async () => {
    const { config, students, fractions } = assembleExam({ ...(await load()), totalMarks: TOTALS })
    const { columns, rows } = scoresTable(config, students, fractions)
    assert.deepEqual(columns, ['student_id', '10', '11', '20'])
    const byId = Object.fromEntries(rows.map((r) => [r.student_id, r]))
    assert.deepEqual([byId['1001']['10'], byId['1001']['11'], byId['1001']['20']], [20, 0, 30])
    assert.deepEqual([byId['1002']['10'], byId['1002']['11'], byId['1002']['20']], ['', 20, 60])
    assert.ok(!('1004' in byId), 'an enrolled student with no sheet row has no scores row: they count as absent')
    assert.equal(rows.length, 4)
  })

  it('follows edited marks and removed questions', async () => {
    const { config, students, fractions } = assembleExam({ ...(await load()), totalMarks: TOTALS })
    const edited = config.filter((r) => r.question_id !== '11').map((r) => (r.question_id === '20' ? { ...r, marks: 10 } : r))
    const { columns, rows } = scoresTable(edited, students, fractions)
    assert.deepEqual(columns, ['student_id', '10', '20'])
    assert.equal(rows.find((r) => r.student_id === '1001')['20'], 5)
  })

  it('writes the cohort file: id, name and section', async () => {
    const { students } = assembleExam({ ...(await load()), totalMarks: TOTALS })
    const table = studentsTable(students)
    assert.deepEqual(table.columns, ['student_id', 'student_name', 'section'])
    assert.deepEqual(table.rows[2], { student_id: '1003', student_name: 'Chitra M', section: '' })
    assert.equal(table.rows.length, 5, 'the whole cohort, including students in no sheet')
  })

  it('writes the attendance file for every student', async () => {
    const { students } = assembleExam({ ...(await load()), totalMarks: TOTALS })
    const table = attendanceTable(students)
    assert.deepEqual(table.columns, ['student_id', 'attendance'])
    assert.deepEqual(table.rows.map((r) => r.attendance), ['present', 'present', 'absent', 'present', 'absent'])
  })

  it('writes the config table with our column names', async () => {
    const { config } = assembleExam({ ...(await load()), totalMarks: TOTALS })
    assert.deepEqual(configTable(config).columns, ['question_id', 'question_type', 'question_difficulty', 'question_dimension', 'question_topics', 'marks', 'expected_solve_rate'])
  })

  it('turns an extra listing row into a config row with the marks given', async () => {
    const { extras } = assembleExam({ ...(await load()), totalMarks: TOTALS })
    const row = extraToConfig(extras[0], 5)
    assert.deepEqual([row.question_id, row.question_type, row.marks], ['22', 'assignment', 5])
  })

  it('produces files the application accepts', async () => {
    const { config, students, fractions } = assembleExam({ ...(await load()), totalMarks: TOTALS })
    const { toCsv } = await import('../src/lib/convert/common.js')
    const c = configTable(config)
    const s = scoresTable(config, students, fractions)
    const t = studentsTable(students)
    const a = attendanceTable(students)
    const cohort = readStudentNames(await parse(toCsv(t.rows, t.columns)))
    assert.deepEqual(cohort.errors, [])
    assert.deepEqual(readAttendance(await parse(toCsv(a.rows, a.columns))).errors, [])
    const { dataset, errors } = readDataset({
      config: await parse(toCsv(c.rows, c.columns)),
      scores: await parse(toCsv(s.rows, s.columns)),
      cohort: cohort.students,
      attendance: await parse(toCsv(a.rows, a.columns)),
    })
    assert.deepEqual(errors, [])
    assert.equal(dataset.students.length, 5)
    assert.equal(dataset.students.filter((x) => x.absent).length, 2)
    assert.equal(dataset.questions.reduce((n, q) => n + q.marks, 0), 100)
  })
})

describe('absent students with marks in the sheets', () => {
  it('writes blank scores for an absent student, whatever the sheet recorded', async () => {
    const parts = await load()
    const exam = assembleExam({ ...parts, totalMarks: TOTALS })
    const absent = exam.students.find((s) => s.id === '1003')
    assert.equal(absent.absent, true)
    exam.fractions['1003'] = { 10: 1, 11: 1, 20: 1 } // the sheet recorded marks although the student is absent
    const { rows } = scoresTable(exam.config, exam.students, exam.fractions)
    const row = rows.find((r) => r.student_id === '1003')
    assert.deepEqual([row['10'], row['11'], row['20']], ['', '', ''])
  })

  it('reports absent students who have marks, and counts them', async () => {
    const parts = await load()
    parts.quiz.fractions['1003'] = { 10: 1 }
    const { issues } = assembleExam({ ...parts, totalMarks: TOTALS })
    assert.ok(issues.some((i) => i.level === 'warning' && i.text.includes('1003') && /absent/i.test(i.text) && /marks/i.test(i.text)), JSON.stringify(issues))
  })

  it('keeps the marks when the student is not absent after all', async () => {
    const parts = await load()
    const exam = assembleExam({ ...parts, totalMarks: TOTALS })
    const students = exam.students.map((s) => (s.id === '1001' ? { ...s, absent: false } : s))
    const { rows } = scoresTable(exam.config, students, exam.fractions)
    assert.equal(rows.find((r) => r.student_id === '1001')['10'], 20)
  })
})
