import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { detectSheet } from '../src/lib/convert/detect.js'
import { readListing } from '../src/lib/convert/listing.js'
import { readCoding } from '../src/lib/convert/coding.js'
import { readQuiz } from '../src/lib/convert/quiz.js'
import { readEnrolled } from '../src/lib/convert/enrolled.js'
import { cleanId, toCsv } from '../src/lib/convert/common.js'
import { parse } from './fixtures.js'

describe('cleanId', () => {
  it('removes thousands separators and spaces', () => {
    assert.equal(cleanId('1,698,982'), '1698982')
    assert.equal(cleanId(' 28548 '), '28548')
    assert.equal(cleanId(null), '')
  })
})

describe('toCsv', () => {
  it('writes the columns in order, quoting where needed, with a trailing newline', () => {
    assert.equal(toCsv([{ a: 1, b: 'x,y' }, { a: '', b: null }], ['b', 'a']), 'b,a\n"x,y",1\n,\n')
  })
})

describe('detectSheet', () => {
  const fields = async (csv) => (await parse(csv)).meta.fields
  it('recognises the four sheets by their columns', async () => {
    assert.equal(detectSheet(await fields('Question ID,Type,Set,Dimensions,Topics\n')), 'listing')
    assert.equal(detectSheet(await fields('user_id,question_id,Total Test Case,partial_marks,Attendance\n')), 'coding')
    assert.equal(detectSheet(await fields('user_id,question_id,question_no,marks_contest,Attendance\n')), 'quiz')
    assert.equal(detectSheet(await fields('student_id,student_name,,,\n')), 'enrolled')
  })
  it('does not recognise anything else', async () => {
    assert.equal(detectSheet(await fields('a,b,c\n')), null)
    assert.equal(detectSheet(undefined), null)
  })
})

const LISTING = `Question ID,Type,Set,SubType,Difficulty,Dimensions,Topics,ComprehensionID,Marks,Solve Rate,Notion URL
178705,Assessment,A,MCQ,EASY,Recall,HTTP 123,,,85,x
178708,Assessment,D,MCQ,MED,Comprehension;Evaluate,NPM;Streams 9795,,,,x
28506,Assignment,A,Coding,BEGINNER,Build,Express,,,,x
19921,Assignment,,Coding,CHALLENGE,,,,,,x
99,Quiz,A,MCQ,EASY,Recall,T,,,,x
98,Assessment,A,MCQ,TOUGH,Magic,T,,,150,x
`

describe('readListing topics of comprehension questions', () => {
  it('borrows the topics from another question on the same passage when a question has none', async () => {
    const { questions } = readListing(await parse('Question ID,Type,Set,Difficulty,Dimensions,Topics,ComprehensionID\n1,Assessment,A,EASY,Comprehension,SQL Joins 2171,7\n2,Assessment,A,EASY,Comprehension,,7\n3,Assessment,A,EASY,Comprehension,,8\n'))
    assert.deepEqual(questions[1].topics, ['SQL Joins'])
    assert.deepEqual(questions[1].problems, [])
    assert.ok(questions[2].problems.includes('no topic'), 'nothing to borrow from another passage')
  })
})

describe('readListing', () => {
  it('maps the sheet vocabulary onto ours', async () => {
    const { questions } = readListing(await parse(LISTING))
    const q = (id) => questions.find((x) => x.id === id)
    assert.deepEqual(
      [q('178705').type, q('178705').set, q('178705').difficulty, q('178705').dimensions, q('178705').topics, q('178705').expectedSolveRate],
      ['assessment', 'A', 'easy', ['Recall'], ['HTTP'], '85']
    )
    assert.equal(q('178708').difficulty, 'medium', 'MED')
    assert.deepEqual(q('178708').dimensions, ['Comprehend', 'Evaluate'], 'Comprehension becomes Comprehend')
    assert.deepEqual(q('178708').topics, ['NPM', 'Streams'], 'the trailing number is dropped from each topic')
    assert.equal(q('178708').expectedSolveRate, '')
    assert.equal(q('28506').difficulty, 'beginner')
    assert.equal(q('28506').type, 'assignment')
  })

  it('keeps every row and lists what is wrong with it', async () => {
    const { questions } = readListing(await parse(LISTING))
    const q = (id) => questions.find((x) => x.id === id)
    assert.equal(questions.length, 6)
    assert.deepEqual(q('178705').problems, [])
    assert.ok(q('19921').problems.some((p) => /dimension/i.test(p)))
    assert.ok(q('19921').problems.some((p) => /topic/i.test(p)))
    assert.ok(q('19921').problems.some((p) => /set/i.test(p)))
    assert.ok(q('99').problems.some((p) => /type/i.test(p)))
    assert.ok(q('98').problems.some((p) => /difficulty/i.test(p) && p.includes('TOUGH')))
    assert.ok(q('98').problems.some((p) => /dimension/i.test(p) && p.includes('Magic')))
    assert.ok(q('98').problems.some((p) => /solve rate/i.test(p)))
  })

  it('reads the solve rate from whichever column has "solve rate" in its name', async () => {
    const { questions } = readListing(await parse('Question ID,Type,Set,Difficulty,Dimensions,Topics,Expected Solve Rate ADYPU\n1,Assessment,A,EASY,Recall,T,90\n'))
    assert.equal(questions[0].expectedSolveRate, '90')
  })

  it('removes a byte order mark and reports the file row of each question', async () => {
    const { questions } = readListing(await parse('Question ID,Type,Set,Difficulty,Dimensions,Topics\n1,Assessment,A,EASY,Recall,T\n2,Assessment,A,EASY,Recall,T\n'))
    assert.deepEqual(questions.map((q) => q.row), [2, 3])
  })

  it('reports duplicate ids', async () => {
    const { questions } = readListing(await parse('Question ID,Type,Set,Difficulty,Dimensions,Topics\n1,Assessment,A,EASY,Recall,T\n1,Assessment,B,EASY,Recall,T\n'))
    assert.ok(questions[1].problems.some((p) => /more than once|duplicate/i.test(p)))
  })
})

const CODING = `user_id,Student Name,Email,Assignment ID,Question ID_x,question_id,Question Title,difficulty_type,Total Test Case,partial_marks,final_scaled_marks,Attendance
"1,001",Asha,a@x.com,9,0,28548,URL Shortner,Easy,14,0.5,0.5,Present
"1,001",Asha,a@x.com,9,0,28523,Debug,Easy,5,,,Present
"1,002",Bala,b@x.com,9,0,28548,URL Shortner,Easy,14,1,1,Present
"1,003",Chitra,c@x.com,9,0,28548,URL Shortner,Easy,14,0,0,Absent
`

describe('readCoding', () => {
  let result
  const load = async () => (result ??= readCoding(await parse(CODING)))

  it('lists the questions in order of appearance', async () => {
    const { questions } = await load()
    assert.deepEqual(questions.map((q) => [q.id, q.title, q.totalCases]), [['28548', 'URL Shortner', 14], ['28523', 'Debug', 5]])
  })

  it('lists students with cleaned ids and attendance', async () => {
    const { students } = await load()
    assert.deepEqual(students, [
      { id: '1001', name: 'Asha', absent: false },
      { id: '1002', name: 'Bala', absent: false },
      { id: '1003', name: 'Chitra', absent: true },
    ])
  })

  it('gives the fraction of the question earned, and nothing for a blank (unattempted) cell or a missing row', async () => {
    const { fractions } = await load()
    assert.deepEqual(fractions['1001'], { 28548: 0.5 })
    assert.deepEqual(fractions['1002'], { 28548: 1 })
    assert.deepEqual(fractions['1003'], { 28548: 0 })
  })

  it('reports a fraction above 1', async () => {
    const { issues } = readCoding(await parse(CODING.replace('0.5,0.5', '1.5,1.5')))
    assert.ok(issues.some((i) => /above 1/i.test(i.text)))
  })

  it('reports a student with two rows for the same question and keeps the higher score', async () => {
    const dup = CODING + '"1,002",Bala,b@x.com,9,0,28548,URL Shortner,Easy,14,0.25,0.25,Present\n'
    const { fractions, issues } = readCoding(await parse(dup))
    assert.equal(fractions['1002']['28548'], 1)
    assert.ok(issues.some((i) => /more than one row/i.test(i.text) && i.text.includes('1002')))
  })
})

const QUIZ = `user_id,question_id,question_no,difficulty_level,question_type,student_name,attempt_count,marks_contest,Attendance
"1,001",178708,2,Easy,MCQ,Asha,1,4,Present
"1,001",178705,1,Easy,Puzzle,Asha,1,-1,Present
"1,002",178708,2,Easy,MCQ,Bala,1,-1,Present
"1,002",178705,1,Easy,Puzzle,Bala,0,0,Present
"1,003",178708,2,Easy,MCQ,Chitra,0,0,Absent
`

describe('readQuiz', () => {
  it('lists the questions in question_no order', async () => {
    const { questions } = readQuiz(await parse(QUIZ))
    assert.deepEqual(questions.map((q) => [q.id, q.no]), [['178705', 1], ['178708', 2]])
  })

  it('turns negative marks into zero and an unattempted question into a blank', async () => {
    const { fractions, issues } = readQuiz(await parse(QUIZ))
    assert.deepEqual(fractions['1001'], { 178708: 1, 178705: 0 })
    assert.deepEqual(fractions['1002'], { 178708: 0 }, 'wrong answers score 0; question 178705 was not attempted')
    assert.deepEqual(fractions['1003'], {})
    assert.ok(issues.some((i) => /negative/i.test(i.text) && i.text.includes('2')))
  })

  it('lists students with attendance', async () => {
    const { students } = readQuiz(await parse(QUIZ))
    assert.deepEqual(students.map((s) => [s.id, s.absent]), [['1001', false], ['1002', false], ['1003', true]])
  })

  it('scales to the question’s highest mark when a question is worth different amounts', async () => {
    const csv = 'user_id,question_id,question_no,difficulty_level,question_type,student_name,attempt_count,marks_contest,Attendance\n1,5,1,Easy,MCQ,A,1,4,Present\n2,5,1,Easy,MCQ,B,1,2,Present\n'
    assert.deepEqual([readQuiz(await parse(csv)).fractions['2']['5']], [0.5])
  })
})

describe('readEnrolled', () => {
  it('reads ids and names, ignoring empty columns and rows without an id', async () => {
    const { students, issues } = readEnrolled(await parse('student_id,student_name,,,\n1712882,Mahaveer,,,\n,Nobody,,,\n1729648,Utsav,,,\n1712882,Again,,,\n'))
    assert.deepEqual(students, [{ id: '1712882', name: 'Mahaveer' }, { id: '1729648', name: 'Utsav' }])
    assert.ok(issues.some((i) => /no student_id/i.test(i.text)))
    assert.ok(issues.some((i) => /more than once/i.test(i.text) && i.text.includes('1712882')))
  })
})
