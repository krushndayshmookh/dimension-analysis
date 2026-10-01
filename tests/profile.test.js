import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import fs from 'fs'
import path from 'path'
import os from 'os'

import {
  DIM_ORDER,
  TIER_ORDER,
  normalizeDimension,
  normalizeDimensions,
  orderDimensions,
  orderDifficulties,
  parseCsv,
  readExamConfig,
  readStudentScores,
  readStudentInfo,
  buildProfiles,
  DEFAULT_WEAK_THRESHOLD,
  getWeakDimensions,
  getWeakestDimension,
  classifyDimension,
  getStudentDimensionStatuses,
  DEFAULT_THRESHOLDS,
  computePaperAnalysis,
  computeDecileBins,
  computeRawMarkBins,
  computeDistributionStats,
  getDifficultyVerdict,
  parseExpectedSolveRate,
  computeQuestionSolveRates,
  getDefaultExpectedRate,
  DEFAULT_EXPECTED_SOLVE_RATES,
} from '../src/profile.js'

import {
  saveExam,
  deleteExam,
  getIndex,
  getExam,
  listStudents,
  getStudentHistory,
  updateLongitudinalHistory,
  getSamples,
} from '../server/storage.js'

describe('Dimension Normalization', () => {
  it('normalizes single letter abbreviations and full names case-insensitively', () => {
    assert.strictEqual(normalizeDimension('r'), 'Recall')
    assert.strictEqual(normalizeDimension('R'), 'Recall')
    assert.strictEqual(normalizeDimension('recall'), 'Recall')
    assert.strictEqual(normalizeDimension('RECALL'), 'Recall')
    assert.strictEqual(normalizeDimension('c'), 'Comprehend')
    assert.strictEqual(normalizeDimension('comprehension'), 'Comprehend')
    assert.strictEqual(normalizeDimension('s'), 'Solve')
    assert.strictEqual(normalizeDimension('solve'), 'Solve')
    assert.strictEqual(normalizeDimension('b'), 'Build')
    assert.strictEqual(normalizeDimension('build'), 'Build')
    assert.strictEqual(normalizeDimension('e'), 'Evaluate')
    assert.strictEqual(normalizeDimension('evaluate'), 'Evaluate')
    assert.strictEqual(normalizeDimension('evaluation'), 'Evaluate')
  })

  it('normalizes delimited strings using comma, slash, pipe, semicolon', () => {
    assert.deepStrictEqual(normalizeDimensions('Recall, Build'), ['Recall', 'Build'])
    assert.deepStrictEqual(normalizeDimensions('R / B'), ['Recall', 'Build'])
    assert.deepStrictEqual(normalizeDimensions('C|S'), ['Comprehend', 'Solve'])
    assert.deepStrictEqual(normalizeDimensions('solve; evaluate'), ['Solve', 'Evaluate'])
    assert.deepStrictEqual(normalizeDimensions('R/C;S|B,E'), ['Recall', 'Comprehend', 'Solve', 'Build', 'Evaluate'])
  })

  it('deduplicates dimensions', () => {
    assert.deepStrictEqual(normalizeDimensions('Recall, R, recall'), ['Recall'])
  })
})

describe('Question Dimension Equal Splitting', () => {
  it('splits marks equally across dimensions for multi-dimension questions', () => {
    const rows = [
      {
        question_id: 'Q1',
        type: 'MCQ',
        difficulty: 'medium',
        dimension: 'Recall, Build',
        topics: 'Algorithms',
        marks: '6',
      },
    ]

    const { questions, warnings, summary } = readExamConfig(rows)
    assert.strictEqual(warnings.length, 0)
    assert.strictEqual(questions.length, 1)

    const q = questions[0]
    assert.deepStrictEqual(q.dimensions, ['Recall', 'Build'])
    assert.strictEqual(q.marks, 6)
    assert.strictEqual(q.dimensionMarks.Recall, 3)
    assert.strictEqual(q.dimensionMarks.Build, 3)
  })

  it('splits 3 dimensions equally (e.g. 9 marks across Recall, Comprehend, Solve = 3 each)', () => {
    const rows = [
      {
        question_id: 'Q2',
        type: 'Code',
        difficulty: 'hard',
        dimension: 'R; C; S',
        topics: 'Data Structures',
        marks: '9',
      },
    ]

    const { questions } = readExamConfig(rows)
    const q = questions[0]
    assert.deepStrictEqual(q.dimensions, ['Recall', 'Comprehend', 'Solve'])
    assert.strictEqual(q.dimensionMarks.Recall, 3)
    assert.strictEqual(q.dimensionMarks.Comprehend, 3)
    assert.strictEqual(q.dimensionMarks.Solve, 3)
  })
})

describe('Proportional Partial Score Allocation', () => {
  it('allocates partial marks proportionally across dimensions (e.g. 4/6 marks on Recall & Build = 2 each)', () => {
    const questions = [
      {
        id: 'Q1',
        marks: 6,
        dimensions: ['Recall', 'Build'],
        dimensionMarks: { Recall: 3, Build: 3 },
        difficulty: 'medium',
        topics: ['Algorithms'],
      },
    ]

    const scores = {
      student_1: { Q1: 4 },
    }

    const { students } = buildProfiles(questions, scores)
    const student = students[0]

    assert.strictEqual(student.earned, 4)
    assert.strictEqual(student.totalExam, 6)
    assert.strictEqual(student.totalAttempted, 6)

    // Recall: availableExam = 3, availableAttempted = 3, earned = 4 * (1/2) = 2
    assert.strictEqual(student.dimensions.Recall.availableExam, 3)
    assert.strictEqual(student.dimensions.Recall.availableAttempted, 3)
    assert.strictEqual(student.dimensions.Recall.earned, 2)
    assert.strictEqual(student.dimensions.Recall.masteryPct, 66.7)
    assert.strictEqual(student.dimensions.Recall.accuracyPct, 66.7)

    // Build: availableExam = 3, availableAttempted = 3, earned = 4 * (1/2) = 2
    assert.strictEqual(student.dimensions.Build.availableExam, 3)
    assert.strictEqual(student.dimensions.Build.availableAttempted, 3)
    assert.strictEqual(student.dimensions.Build.earned, 2)
    assert.strictEqual(student.dimensions.Build.masteryPct, 66.7)
    assert.strictEqual(student.dimensions.Build.accuracyPct, 66.7)
  })

  it('handles partial scores on 3-dimension questions', () => {
    const questions = [
      {
        id: 'Q1',
        marks: 9,
        dimensions: ['Recall', 'Comprehend', 'Solve'],
        dimensionMarks: { Recall: 3, Comprehend: 3, Solve: 3 },
        difficulty: 'hard',
        topics: ['Data Structures'],
      },
    ]

    const scores = {
      student_1: { Q1: 6 },
    }

    const { students } = buildProfiles(questions, scores)
    const student = students[0]

    assert.strictEqual(student.dimensions.Recall.earned, 2)
    assert.strictEqual(student.dimensions.Comprehend.earned, 2)
    assert.strictEqual(student.dimensions.Solve.earned, 2)
    assert.strictEqual(student.dimensions.Recall.masteryPct, 66.7)
  })
})

describe('Overall Mastery vs Attempted Accuracy with Unattempted Questions', () => {
  it('correctly calculates mastery % and accuracy % when questions are unattempted', () => {
    const questions = [
      {
        id: 'Q1',
        marks: 10,
        dimensions: ['Recall'],
        dimensionMarks: { Recall: 10 },
        difficulty: 'easy',
        topics: ['Algorithms'],
      },
      {
        id: 'Q2',
        marks: 10,
        dimensions: ['Solve'],
        dimensionMarks: { Solve: 10 },
        difficulty: 'hard',
        topics: ['Data Structures'],
      },
    ]

    // Student attempted Q1 and scored 8, but did not attempt Q2
    const scores = {
      student_1: { Q1: 8 },
    }

    const { students } = buildProfiles(questions, scores)
    const student = students[0]

    assert.strictEqual(student.earned, 8)
    assert.strictEqual(student.totalExam, 20)
    assert.strictEqual(student.totalAttempted, 10)

    // Overall mastery: 8 / 20 * 100 = 40.0%
    assert.strictEqual(student.masteryPct, 40.0)

    // Attempted accuracy: 8 / 10 * 100 = 80.0%
    assert.strictEqual(student.accuracyPct, 80.0)

    // Unattempted dimension: Solve
    assert.strictEqual(student.dimensions.Solve.availableExam, 10)
    assert.strictEqual(student.dimensions.Solve.availableAttempted, 0)
    assert.strictEqual(student.dimensions.Solve.earned, 0)
    assert.strictEqual(student.dimensions.Solve.masteryPct, 0)
    assert.strictEqual(student.dimensions.Solve.accuracyPct, null)
  })

  it('handles zero attempted questions gracefully', () => {
    const questions = [
      {
        id: 'Q1',
        marks: 10,
        dimensions: ['Recall'],
        dimensionMarks: { Recall: 10 },
        difficulty: 'easy',
        topics: ['Algorithms'],
      },
    ]

    const scores = {
      student_inactive: {},
    }

    const { students } = buildProfiles(questions, scores)
    const student = students[0]

    assert.strictEqual(student.totalExam, 10)
    assert.strictEqual(student.totalAttempted, 0)
    assert.strictEqual(student.earned, 0)
    assert.strictEqual(student.masteryPct, 0)
    assert.strictEqual(student.accuracyPct, null)
  })

  it('handles question attempted with 0 score (attempted != 0)', () => {
    const questions = [
      {
        id: 'Q1',
        marks: 10,
        dimensions: ['Recall'],
        dimensionMarks: { Recall: 10 },
        difficulty: 'easy',
        topics: ['Algorithms'],
      },
    ]

    const scores = {
      student_zero: { Q1: 0 },
    }

    const { students } = buildProfiles(questions, scores)
    const student = students[0]

    assert.strictEqual(student.totalExam, 10)
    assert.strictEqual(student.totalAttempted, 10)
    assert.strictEqual(student.earned, 0)
    assert.strictEqual(student.masteryPct, 0)
    assert.strictEqual(student.accuracyPct, 0)
  })
})

describe('Difficulty and Topic Breakdowns', () => {
  it('correctly calculates difficulty and topic breakdowns', () => {
    const questions = [
      {
        id: 'Q1',
        marks: 10,
        dimensions: ['Recall'],
        dimensionMarks: { Recall: 10 },
        difficulty: 'beginner',
        topics: ['Algorithms'],
      },
      {
        id: 'Q2',
        marks: 10,
        dimensions: ['Solve'],
        dimensionMarks: { Solve: 10 },
        difficulty: 'challenge',
        topics: ['System Design'],
      },
      {
        id: 'Q3',
        marks: 10,
        dimensions: ['Build'],
        dimensionMarks: { Build: 10 },
        difficulty: 'medium',
        topics: ['Algorithms', 'Data Structures'], // Multiple topics
      },
    ]

    const scores = {
      s1: { Q1: 10, Q2: 4, Q3: 8 },
    }

    const { students, difficulties, topics } = buildProfiles(questions, scores)
    const s = students[0]

    assert.deepStrictEqual(difficulties, ['beginner', 'medium', 'challenge'])
    assert.deepStrictEqual(topics, ['Algorithms', 'Data Structures', 'System Design'])

    // Difficulty breakdown
    assert.strictEqual(s.difficulties.beginner.earned, 10)
    assert.strictEqual(s.difficulties.beginner.availableExam, 10)
    assert.strictEqual(s.difficulties.beginner.masteryPct, 100)

    assert.strictEqual(s.difficulties.challenge.earned, 4)
    assert.strictEqual(s.difficulties.challenge.availableExam, 10)
    assert.strictEqual(s.difficulties.challenge.masteryPct, 40.0)

    // Topic breakdown with multi-topic split
    // Q3 has 10 marks and 2 topics -> 5 marks each. Score 8 -> 4 marks each.
    // Algorithms = Q1 (10/10) + Q3 (4/5) = 14 earned out of 15 availableExam
    assert.strictEqual(s.topics.Algorithms.earned, 14)
    assert.strictEqual(s.topics.Algorithms.availableExam, 15)
    assert.strictEqual(s.topics.Algorithms.masteryPct, 93.3)

    // Data Structures = Q3 (4/5) = 4 earned out of 5 availableExam
    assert.strictEqual(s.topics['Data Structures'].earned, 4)
    assert.strictEqual(s.topics['Data Structures'].availableExam, 5)
    assert.strictEqual(s.topics['Data Structures'].masteryPct, 80.0)

    // System Design = Q2 (4/10) = 4 earned out of 10 availableExam
    assert.strictEqual(s.topics['System Design'].earned, 4)
    assert.strictEqual(s.topics['System Design'].availableExam, 10)
    assert.strictEqual(s.topics['System Design'].masteryPct, 40.0)

    // Weakest and strongest dimensions
    assert.strictEqual(s.strongest, 'Recall')
    assert.strictEqual(s.weakest, 'Solve')
  })
})

describe('Weak Dimension Thresholding', () => {
  it('does not classify a dimension with 95% as weak when default threshold is 50%', () => {
    // High-performing student: 100% on Recall, 95% on Comprehend
    const questions = [
      { id: 'Q1', difficulty: 'easy', dimensions: ['Recall'], marks: 100 },
      { id: 'Q2', difficulty: 'medium', dimensions: ['Comprehend'], marks: 100 },
    ]
    const scores = {
      S_HIGH: { Q1: 100, Q2: 95 },
    }
    const studentInfo = {
      S_HIGH: { id: 'S_HIGH', name: 'High Performer' },
    }

    const { students } = buildProfiles(questions, scores, studentInfo, { weakThreshold: 50 })
    const student = students[0]

    assert.strictEqual(student.dimensions.Recall.masteryPct, 100)
    assert.strictEqual(student.dimensions.Comprehend.masteryPct, 95)
    // Even though Comprehend (95%) is the lowest score, it is >= 50% and must NOT be marked weak
    assert.strictEqual(student.weakest, null, 'Weakest should be null because 95% >= 50%')
    assert.strictEqual(student.weakestDimension, null)
    assert.deepStrictEqual(student.weakDimensions, [])
    assert.strictEqual(student.hasWeakDimension, false)
    assert.strictEqual(student.strongest, 'Recall')
  })

  it('correctly marks dimension as weak when below threshold', () => {
    const questions = [
      { id: 'Q1', difficulty: 'easy', dimensions: ['Recall'], marks: 10 },
      { id: 'Q2', difficulty: 'medium', dimensions: ['Solve'], marks: 10 },
      { id: 'Q3', difficulty: 'hard', dimensions: ['Build'], marks: 10 },
    ]
    // S1 scores: Recall 10 (100%), Solve 4 (40%), Build 3 (30%)
    const scores = {
      S1: { Q1: 10, Q2: 4, Q3: 3 },
    }

    const { students } = buildProfiles(questions, scores, {}, { weakThreshold: 50 })
    const student = students[0]

    // 40% and 30% are below 50%
    assert.strictEqual(student.hasWeakDimension, true)
    assert.deepStrictEqual(student.weakDimensions.sort(), ['Build', 'Solve'].sort())
    // Weakest is Build (30% < 40%)
    assert.strictEqual(student.weakest, 'Build')
  })

  it('supports custom thresholds and helper functions', () => {
    const dimensions = {
      Recall: { masteryPct: 98 },
      Comprehend: { masteryPct: 92 },
      Solve: { masteryPct: 85 },
    }

    // With 50% threshold: none are weak
    assert.deepStrictEqual(getWeakDimensions(dimensions, 50), [])
    assert.strictEqual(getWeakestDimension(dimensions, 50), null)

    // With 90% threshold: Solve (85%) is weak
    assert.deepStrictEqual(getWeakDimensions(dimensions, 90), ['Solve'])
    assert.strictEqual(getWeakestDimension(dimensions, 90), 'Solve')

    // With 95% threshold: Comprehend (92%) and Solve (85%) are weak, Solve is weakest
    assert.deepStrictEqual(getWeakDimensions(dimensions, 95).sort(), ['Comprehend', 'Solve'].sort())
    assert.strictEqual(getWeakestDimension(dimensions, 95), 'Solve')
  })

  it('supports multiple weak and multiple strong dimensions and enforces +-15% class average rule', () => {
    // 3 students in cohort
    // Dimension 1 (Recall): class average is 65%. S1 gets 90% (>80% and >65+15=80%) -> Strong!
    // Dimension 2 (Comprehend): class average is 60%. S1 gets 85% (>80% and >60+15=75%) -> Strong!
    // Dimension 3 (Solve): class average is 65%. S1 gets 35% (<50% and <65-15=50%) -> Weak!
    // Dimension 4 (Build): class average is 70%. S1 gets 40% (<50% and <70-15=55%) -> Weak!
    // Dimension 5 (Evaluate): class average is 60%. S1 gets 65% (within 60+-15) -> Average!
    const questions = [
      { id: 'Q1', dimensions: ['Recall'], marks: 100 },
      { id: 'Q2', dimensions: ['Comprehend'], marks: 100 },
      { id: 'Q3', dimensions: ['Solve'], marks: 100 },
      { id: 'Q4', dimensions: ['Build'], marks: 100 },
      { id: 'Q5', dimensions: ['Evaluate'], marks: 100 },
    ]
    const scores = {
      S1: { Q1: 90, Q2: 85, Q3: 35, Q4: 40, Q5: 65 },
      S2: { Q1: 50, Q2: 45, Q3: 80, Q4: 85, Q5: 55 },
      S3: { Q1: 55, Q2: 50, Q3: 80, Q4: 85, Q5: 60 },
    }

    const { students } = buildProfiles(questions, scores)
    const s1 = students.find((s) => s.id === 'S1')

    // Multiple strong dimensions
    assert.deepStrictEqual(s1.strongDimensions.sort(), ['Comprehend', 'Recall'].sort())
    // Multiple weak dimensions
    assert.deepStrictEqual(s1.weakDimensions.sort(), ['Build', 'Solve'].sort())
    // Average dimensions (within +-15% of class average)
    assert.deepStrictEqual(s1.averageDimensions, ['Evaluate'])

    // hasWeakDimension and hasStrongDimension booleans
    assert.strictEqual(s1.hasWeakDimension, true)
    assert.strictEqual(s1.hasStrongDimension, true)

    // Status on dimensions
    assert.strictEqual(s1.dimensions.Recall.status, 'strong')
    assert.strictEqual(s1.dimensions.Comprehend.status, 'strong')
    assert.strictEqual(s1.dimensions.Solve.status, 'weak')
    assert.strictEqual(s1.dimensions.Build.status, 'weak')
    assert.strictEqual(s1.dimensions.Evaluate.status, 'average')

    // diffFromCohort on dimensions
    assert.strictEqual(s1.dimensions.Recall.diffFromCohort, 25.0)
    assert.strictEqual(s1.dimensions.Solve.diffFromCohort, -30.0)

    // DEFAULT_THRESHOLDS properties
    assert.strictEqual(DEFAULT_THRESHOLDS.weakAbs, 50)
    assert.strictEqual(DEFAULT_THRESHOLDS.strongAbs, 80)
    assert.strictEqual(DEFAULT_THRESHOLDS.cohortMargin, 15)
  })

  it('classifies dimensions within +-15% of class average as average (neither strong nor weak)', () => {
    // Class average is 60%. Scores between 45% and 75% are within +-15% and must be average
    assert.strictEqual(classifyDimension(60, 60), 'average')
    assert.strictEqual(classifyDimension(55, 60), 'average')
    assert.strictEqual(classifyDimension(70, 60), 'average')
    assert.strictEqual(classifyDimension(48, 60), 'average') // <50 but within 60-15=45..75 -> average!
    assert.strictEqual(classifyDimension(78, 60), 'average') // >60+15=75, but < 80% absolute threshold -> average!

    // Dimension must be BOTH < 50% AND < class - 15% to be weak
    assert.strictEqual(classifyDimension(42, 60), 'weak') // 42 < 50 and 42 < 45 -> weak!
    assert.strictEqual(classifyDimension(48, 70), 'weak') // 48 < 50 and 48 < 70-15=55 -> weak!
    assert.strictEqual(classifyDimension(90, 98), 'average') // 90 is lowest in a 98% class, but >= 50% -> NOT weak!

    // Dimension must be BOTH >= 80% AND > class + 15% to be strong
    assert.strictEqual(classifyDimension(85, 65), 'strong') // 85 >= 80 and 85 > 65+15=80 -> strong!
    assert.strictEqual(classifyDimension(82, 75), 'average') // 82 >= 80, but within 75+-15=60..90 -> average!
  })
})

describe('Longitudinal History Aggregation', () => {
  let testDataDir

  beforeEach(() => {
    testDataDir = path.join(os.tmpdir(), `dim-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    fs.mkdirSync(testDataDir, { recursive: true })
  })

  afterEach(() => {
    try {
      fs.rmSync(testDataDir, { recursive: true, force: true })
    } catch (e) {
      // cleanup error
    }
  })

  it('aggregates multiple exam histories per student and supports cleanup on exam deletion', () => {
    const studentInfo = {
      S001: { id: 'S001', name: 'Alice Chen' },
    }

    // Exam 1: Midterm
    const questions1 = [
      { id: 'Q1', marks: 10, dimensions: ['Recall'], dimensionMarks: { Recall: 10 }, difficulty: 'easy', topics: ['Algos'] },
    ]
    const scores1 = { S001: { Q1: 8 } }
    const analysis1 = buildProfiles(questions1, scores1, studentInfo)

    saveExam({
      id: 'cs101-midterm',
      courseName: 'CS101',
      examTitle: 'Midterm',
      examDate: '2026-03-15',
      questions: questions1,
      scores: scores1,
      studentInfo,
      analysis: analysis1,
    }, testDataDir)

    // Check index
    let index = getIndex(testDataDir)
    assert.strictEqual(index.length, 1)
    assert.strictEqual(index[0].id, 'cs101-midterm')
    assert.strictEqual(index[0].studentCount, 1)

    // Check student history after Exam 1
    let studentHistory = getStudentHistory('S001', testDataDir)
    assert.ok(studentHistory)
    assert.strictEqual(studentHistory.name, 'Alice Chen')
    assert.strictEqual(studentHistory.exams.length, 1)
    assert.strictEqual(studentHistory.exams[0].examId, 'cs101-midterm')
    assert.strictEqual(studentHistory.exams[0].masteryPct, 80.0)

    // Exam 2: Final
    const questions2 = [
      { id: 'Q1', marks: 10, dimensions: ['Solve'], dimensionMarks: { Solve: 10 }, difficulty: 'hard', topics: ['Algos'] },
      { id: 'Q2', marks: 10, dimensions: ['Build'], dimensionMarks: { Build: 10 }, difficulty: 'challenge', topics: ['Algos'] },
    ]
    const scores2 = { S001: { Q1: 9, Q2: 8 } }
    const analysis2 = buildProfiles(questions2, scores2, studentInfo)

    saveExam({
      id: 'cs101-final',
      courseName: 'CS101',
      examTitle: 'Final',
      examDate: '2026-06-10',
      questions: questions2,
      scores: scores2,
      studentInfo,
      analysis: analysis2,
    }, testDataDir)

    // Check index after Exam 2
    index = getIndex(testDataDir)
    assert.strictEqual(index.length, 2)

    // Check student history has both exams
    studentHistory = getStudentHistory('S001', testDataDir)
    assert.strictEqual(studentHistory.exams.length, 2)
    assert.strictEqual(studentHistory.exams[0].examId, 'cs101-midterm')
    assert.strictEqual(studentHistory.exams[1].examId, 'cs101-final')
    assert.strictEqual(studentHistory.exams[1].earned, 17)
    assert.strictEqual(studentHistory.exams[1].totalExam, 20)
    assert.strictEqual(studentHistory.exams[1].masteryPct, 85.0)

    // List students
    const students = listStudents(testDataDir)
    assert.strictEqual(students.length, 1)
    assert.strictEqual(students[0].id, 'S001')
    assert.strictEqual(students[0].examCount, 2)

    // Delete Exam 1 and verify student history cleans it while preserving Exam 2
    deleteExam('cs101-midterm', testDataDir)

    index = getIndex(testDataDir)
    assert.strictEqual(index.length, 1)
    assert.strictEqual(index[0].id, 'cs101-final')

    const exam1 = getExam('cs101-midterm', testDataDir)
    assert.strictEqual(exam1, null)

    studentHistory = getStudentHistory('S001', testDataDir)
    assert.strictEqual(studentHistory.exams.length, 1)
    assert.strictEqual(studentHistory.exams[0].examId, 'cs101-final')
  })
})

describe('Sample CSVs and Full Workflow Integration', () => {
  it('parses realistic samples and produces complete analysis', async () => {
    const samples = getSamples()
    assert.ok(samples.examConfig)
    assert.ok(samples.studentScores)
    assert.ok(samples.students)

    const qParsed = await parseCsv(samples.examConfig)
    const sParsed = await parseCsv(samples.students)
    const scParsed = await parseCsv(samples.studentScores)

    const { questions, summary } = readExamConfig(qParsed)
    assert.strictEqual(questions.length, 20)
    assert.strictEqual(summary.totalMarks, 100)

    const { students: studentInfo } = readStudentInfo(sParsed)
    assert.strictEqual(Object.keys(studentInfo).length, 12)

    const { scores } = readStudentScores(scParsed, questions)
    assert.strictEqual(Object.keys(scores).length, 12)

    const analysis = buildProfiles(questions, scores, studentInfo)
    assert.strictEqual(analysis.students.length, 12)
    assert.ok(analysis.cohort)
    assert.strictEqual(analysis.cohort.totalExam, 100)
    assert.ok(analysis.cohort.masteryPct > 0)
    assert.ok(analysis.cohort.accuracyPct > 0)

    // Alice Chen (S101) high performer
    const alice = analysis.students.find((s) => s.id === 'S101')
    assert.ok(alice)
    assert.strictEqual(alice.name, 'Alice Chen')
    assert.ok(alice.masteryPct > 90)

    // Evan Wright (S105) skipped challenge questions -> accuracy > mastery
    const evan = analysis.students.find((s) => s.id === 'S105')
    assert.ok(evan)
    assert.ok(evan.accuracyPct > evan.masteryPct)
  })

  it('parses 300-student contest dataset with 25 questions and verifies IRT Monte Carlo properties', async () => {
    const samples = getSamples()
    assert.ok(samples.contestExamConfig)
    assert.ok(samples.contestStudents)
    assert.ok(samples.contestStudentScores)

    const qParsed = await parseCsv(samples.contestExamConfig)
    const sParsed = await parseCsv(samples.contestStudents)
    const scParsed = await parseCsv(samples.contestStudentScores)

    const { questions, summary, warnings: qWarn } = readExamConfig(qParsed)
    assert.strictEqual(questions.length, 25)
    assert.strictEqual(summary.totalMarks, 100)
    assert.strictEqual(qWarn.length, 0)

    const { students: studentMap, warnings: sWarn } = readStudentInfo(sParsed)
    assert.strictEqual(Object.keys(studentMap).length, 300)
    assert.strictEqual(sWarn.length, 0)

    const { scores, attempts, warnings: scWarn } = readStudentScores(scParsed, questions)
    assert.strictEqual(Object.keys(scores).length, 300)
    assert.strictEqual(scWarn.length, 0)

    const analysis = buildProfiles(questions, scores, studentMap)
    assert.strictEqual(analysis.students.length, 300)
    assert.strictEqual(analysis.cohort.totalExam, 100)

    // Verify all 5 cognitive dimensions are represented
    assert.deepStrictEqual(analysis.dimensions, ['Recall', 'Comprehend', 'Solve', 'Build', 'Evaluate'])

    // Verify difficulty progression has zero anomalies
    assert.strictEqual(analysis.paperAnalysis.anomalies.length, 0)
    assert.strictEqual(analysis.paperAnalysis.easiestDifficulty, 'beginner')
    assert.strictEqual(analysis.paperAnalysis.hardestDifficulty, 'challenge')
  })
})

describe('Express Server and Storage Layer', () => {
  let testDataDir
  let testSamplesDir

  beforeEach(() => {
    testDataDir = path.join(os.tmpdir(), `dim-server-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    testSamplesDir = path.join(os.tmpdir(), `dim-samples-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    fs.mkdirSync(testDataDir, { recursive: true })
    fs.mkdirSync(testSamplesDir, { recursive: true })
  })

  afterEach(() => {
    try {
      fs.rmSync(testDataDir, { recursive: true, force: true })
      fs.rmSync(testSamplesDir, { recursive: true, force: true })
    } catch (e) {
      // cleanup error
    }
  })

  it('getSamples returns contents for sample files', () => {
    const samples = getSamples()
    assert.ok(samples.examConfig)
    assert.ok(samples.studentScores)
    assert.ok(samples.students)
    assert.ok(samples.examConfig.includes('question_id'))
    assert.ok(samples.studentScores.includes('marks_gained'))
    assert.ok(samples.students.includes('student_name'))
  })

  it('handles full lifecycle: saveExam, getIndex, getExam, listStudents, getStudentHistory, deleteExam', () => {
    const examPayload = {
      id: 'test-api-exam-01',
      courseName: 'Test CS',
      examTitle: 'Test Exam',
      examDate: '2026-10-01',
      questions: [
        { id: 'Q1', marks: 10, dimensions: ['Recall'], dimensionMarks: { Recall: 10 }, difficulty: 'easy', topics: ['Algos'] },
      ],
      scores: {
        STEST_01: { Q1: 9 },
      },
      studentInfo: {
        STEST_01: { id: 'STEST_01', name: 'Test Student' },
      },
    }

    // 1. saveExam
    const postResult = saveExam(examPayload, testDataDir)
    assert.strictEqual(postResult.success, true)
    assert.strictEqual(postResult.id, 'test-api-exam-01')

    // 2. getIndex
    const examsList = getIndex(testDataDir)
    assert.strictEqual(examsList.length, 1)
    assert.strictEqual(examsList[0].id, 'test-api-exam-01')
    assert.strictEqual(examsList[0].courseName, 'Test CS')
    assert.strictEqual(examsList[0].questionCount, 1)
    assert.strictEqual(examsList[0].studentCount, 1)

    // 3. getExam
    const examData = getExam('test-api-exam-01', testDataDir)
    assert.ok(examData)
    assert.strictEqual(examData.id, 'test-api-exam-01')
    assert.strictEqual(examData.analysis.students[0].earned, 9)

    // 4. listStudents
    const studentsList = listStudents(testDataDir)
    assert.strictEqual(studentsList.length, 1)
    assert.strictEqual(studentsList[0].id, 'STEST_01')
    assert.strictEqual(studentsList[0].name, 'Test Student')
    assert.strictEqual(studentsList[0].examCount, 1)

    // 5. getStudentHistory
    const studentHistory = getStudentHistory('STEST_01', testDataDir)
    assert.ok(studentHistory)
    assert.strictEqual(studentHistory.id, 'STEST_01')
    assert.strictEqual(studentHistory.exams.length, 1)
    assert.strictEqual(studentHistory.exams[0].masteryPct, 90.0)

    // 6. deleteExam
    const delResult = deleteExam('test-api-exam-01', testDataDir)
    assert.strictEqual(delResult.success, true)

    // 7. Verify deletion from exams and index
    const verifyExam = getExam('test-api-exam-01', testDataDir)
    assert.strictEqual(verifyExam, null)
    const verifyIndex = getIndex(testDataDir)
    assert.strictEqual(verifyIndex.length, 0)

    // 8. Verify student history cleaned
    const cleanedHist = getStudentHistory('STEST_01', testDataDir)
    assert.ok(cleanedHist)
    assert.strictEqual(cleanedHist.exams.length, 0)
  })

  it('express app instance is correctly configured with all routes', async () => {
    const { app } = await import('../server/server.js')
    assert.ok(app)
    assert.strictEqual(typeof app.listen, 'function')
    // Check routes registered on router (Express 5 uses app.router, Express 4 uses app._router)
    const stack = (app.router?.stack || app._router?.stack || [])
    const routes = stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }))

    const paths = routes.map((r) => r.path)
    assert.ok(paths.includes('/api/exams'))
    assert.ok(paths.includes('/api/exams/:id'))
    assert.ok(paths.includes('/api/students'))
    assert.ok(paths.includes('/api/students/:id/history'))
    assert.ok(paths.includes('/api/samples'))
  })
})

describe('Paper Distribution and Difficulty Analysis', () => {
  it('computes distribution statistics accurately with edge cases', () => {
    // Normal array
    const stats1 = computeDistributionStats([10, 20, 30, 40, 50])
    assert.strictEqual(stats1.count, 5)
    assert.strictEqual(stats1.mean, 30)
    assert.strictEqual(stats1.median, 30)
    assert.strictEqual(stats1.min, 10)
    assert.strictEqual(stats1.max, 50)
    assert.strictEqual(stats1.stdDev, 14.14)

    // Even number of elements
    const stats2 = computeDistributionStats([10, 20, 30, 40])
    assert.strictEqual(stats2.count, 4)
    assert.strictEqual(stats2.mean, 25)
    assert.strictEqual(stats2.median, 25)
    assert.strictEqual(stats2.stdDev, 11.18)

    // Single value
    const statsSingle = computeDistributionStats([75])
    assert.strictEqual(statsSingle.count, 1)
    assert.strictEqual(statsSingle.mean, 75)
    assert.strictEqual(statsSingle.median, 75)
    assert.strictEqual(statsSingle.min, 75)
    assert.strictEqual(statsSingle.max, 75)
    assert.strictEqual(statsSingle.stdDev, 0)

    // Empty array
    const statsEmpty = computeDistributionStats([])
    assert.strictEqual(statsEmpty.count, 0)
    assert.strictEqual(statsEmpty.mean, 0)
    assert.strictEqual(statsEmpty.median, 0)
    assert.strictEqual(statsEmpty.min, 0)
    assert.strictEqual(statsEmpty.max, 0)
    assert.strictEqual(statsEmpty.stdDev, 0)
  })

  it('computes decile frequency distribution with 10 bins and boundary conditions', () => {
    // Total marks 100
    // Scores: 0 (0-10%), 10 (0-10%), 10.5 (10-20%), 50 (40-50%), 90 (80-90%), 95 (90-100%), 100 (90-100%)
    const items = [
      { id: 's1', pct: 0 },
      { id: 's2', pct: 10 },
      { id: 's3', pct: 10.5 },
      { id: 's4', pct: 50 },
      { id: 's5', pct: 90 },
      { id: 's6', pct: 95 },
      { id: 's7', pct: 100 },
    ]

    const bins = computeDecileBins(items, 100)
    assert.strictEqual(bins.length, 10)

    // Verify all 10 bin labels and bounds
    assert.strictEqual(bins[0].label, '0-10%')
    assert.strictEqual(bins[0].minPct, 0)
    assert.strictEqual(bins[0].maxPct, 10)
    assert.strictEqual(bins[0].minMarks, 0)
    assert.strictEqual(bins[0].maxMarks, 10)
    // 0 and 10 both fall in bin 0
    assert.strictEqual(bins[0].count, 2)
    assert.deepStrictEqual(bins[0].studentIds, ['s1', 's2'])
    assert.strictEqual(bins[0].percentage, 28.6)

    // Bin 1: 10-20%
    assert.strictEqual(bins[1].label, '10-20%')
    assert.strictEqual(bins[1].count, 1)
    assert.deepStrictEqual(bins[1].studentIds, ['s3'])

    // Bin 4: 40-50%
    assert.strictEqual(bins[4].label, '40-50%')
    assert.strictEqual(bins[4].count, 1)
    assert.deepStrictEqual(bins[4].studentIds, ['s4'])

    // Bin 8: 80-90%
    assert.strictEqual(bins[8].label, '80-90%')
    assert.strictEqual(bins[8].count, 1)
    assert.deepStrictEqual(bins[8].studentIds, ['s5'])

    // Bin 9: 90-100%
    assert.strictEqual(bins[9].label, '90-100%')
    assert.strictEqual(bins[9].count, 2)
    assert.deepStrictEqual(bins[9].studentIds, ['s6', 's7'])

    // Total counts sum to 7
    const totalAssigned = bins.reduce((acc, b) => acc + b.count, 0)
    assert.strictEqual(totalAssigned, 7)
  })

  it('computes raw marks frequency distribution with adaptive step sizes', () => {
    // 1. Max marks <= 25 -> step 5
    const itemsShort = [
      { id: 's1', score: 0 },
      { id: 's2', score: 5 },
      { id: 's3', score: 12 },
      { id: 's4', score: 25 },
    ]
    const bins25 = computeRawMarkBins(itemsShort, 25)
    assert.strictEqual(bins25.length, 5)
    assert.strictEqual(bins25[0].label, '0-5')
    assert.strictEqual(bins25[0].minMarks, 0)
    assert.strictEqual(bins25[0].maxMarks, 5)
    assert.strictEqual(bins25[0].count, 2) // 0 and 5
    assert.deepStrictEqual(bins25[0].studentIds, ['s1', 's2'])

    assert.strictEqual(bins25[2].label, '10-15')
    assert.strictEqual(bins25[2].count, 1) // 12
    assert.deepStrictEqual(bins25[2].studentIds, ['s3'])

    assert.strictEqual(bins25[4].label, '20-25')
    assert.strictEqual(bins25[4].count, 1) // 25
    assert.deepStrictEqual(bins25[4].studentIds, ['s4'])

    // 2. Max marks > 25 (e.g. 50) -> step 10
    const itemsLong = [
      { id: 's1', score: 8 },
      { id: 's2', score: 35 },
      { id: 's3', score: 50 },
    ]
    const bins50 = computeRawMarkBins(itemsLong, 50)
    assert.strictEqual(bins50.length, 5)
    assert.strictEqual(bins50[0].label, '0-10')
    assert.strictEqual(bins50[0].count, 1)
    assert.strictEqual(bins50[3].label, '30-40')
    assert.strictEqual(bins50[3].count, 1)
    assert.strictEqual(bins50[4].label, '40-50')
    assert.strictEqual(bins50[4].count, 1)
  })

  it('evaluates dimension difficulty verdicts and verdict tones accurately', () => {
    // 'Very Difficult' (< 40)
    const v1 = getDifficultyVerdict(35)
    assert.strictEqual(v1.verdict, 'Very Difficult')
    assert.strictEqual(v1.verdictTone, 'danger')

    // 'Difficult' (40 <= pct < 55)
    const v2 = getDifficultyVerdict(40)
    assert.strictEqual(v2.verdict, 'Difficult')
    assert.strictEqual(v2.verdictTone, 'warning')

    const v2b = getDifficultyVerdict(54.9)
    assert.strictEqual(v2b.verdict, 'Difficult')
    assert.strictEqual(v2b.verdictTone, 'warning')

    // 'Balanced' (55 <= pct < 70)
    const v3 = getDifficultyVerdict(55)
    assert.strictEqual(v3.verdict, 'Balanced')
    assert.strictEqual(v3.verdictTone, 'neutral')

    const v3b = getDifficultyVerdict(68)
    assert.strictEqual(v3b.verdict, 'Balanced')
    assert.strictEqual(v3b.verdictTone, 'neutral')

    // 'Easy' (70 <= pct < 85)
    const v4 = getDifficultyVerdict(70)
    assert.strictEqual(v4.verdict, 'Easy')
    assert.strictEqual(v4.verdictTone, 'success')

    const v4b = getDifficultyVerdict(84.9)
    assert.strictEqual(v4b.verdict, 'Easy')
    assert.strictEqual(v4b.verdictTone, 'success')

    // 'Very Easy' (>= 85)
    const v5 = getDifficultyVerdict(85)
    assert.strictEqual(v5.verdict, 'Very Easy')
    assert.strictEqual(v5.verdictTone, 'info')

    const v5b = getDifficultyVerdict(98)
    assert.strictEqual(v5b.verdict, 'Very Easy')
    assert.strictEqual(v5b.verdictTone, 'info')
  })

  it('evaluates difficulty spread progression and detects mastery anomalies', () => {
    // Exam with beginner (90%), easy (80%), medium (45%), hard (60%), challenge (30%)
    // Notice medium (45%) < hard (60%) -> Anomaly!
    const questions = [
      { id: 'Q1', difficulty: 'beginner', dimensions: ['Recall'], marks: 10 },
      { id: 'Q2', difficulty: 'easy', dimensions: ['Recall'], marks: 10 },
      { id: 'Q3', difficulty: 'medium', dimensions: ['Solve'], marks: 10 },
      { id: 'Q4', difficulty: 'hard', dimensions: ['Solve'], marks: 10 },
      { id: 'Q5', difficulty: 'challenge', dimensions: ['Build'], marks: 10 },
    ]

    const scores = {
      S1: { Q1: 9, Q2: 8, Q3: 4.5, Q4: 6, Q5: 3 },
      S2: { Q1: 9, Q2: 8, Q3: 4.5, Q4: 6, Q5: 3 },
    }

    const { paperAnalysis } = buildProfiles(questions, scores)
    assert.ok(paperAnalysis)

    // Progression is ordered: beginner -> challenge
    const prog = paperAnalysis.progression
    assert.strictEqual(prog.length, 5)
    assert.deepStrictEqual(prog.map((p) => p.difficulty), ['beginner', 'easy', 'medium', 'hard', 'challenge'])

    // Check stats per tier
    assert.strictEqual(paperAnalysis.difficulties.beginner.meanPct, 90)
    assert.strictEqual(paperAnalysis.difficulties.easy.meanPct, 80)
    assert.strictEqual(paperAnalysis.difficulties.medium.meanPct, 45)
    assert.strictEqual(paperAnalysis.difficulties.hard.meanPct, 60)
    assert.strictEqual(paperAnalysis.difficulties.challenge.meanPct, 30)

    // Anomaly detected: Medium (45%) < Hard (60%)
    assert.strictEqual(paperAnalysis.anomalies.length, 1)
    assert.strictEqual(paperAnalysis.anomalies[0], 'Medium mastery (45%) is lower than Hard (60%)')

    // Verify diagnostic summary
    assert.strictEqual(paperAnalysis.hardestDifficulty, 'challenge')
    assert.strictEqual(paperAnalysis.easiestDifficulty, 'beginner')
    assert.strictEqual(paperAnalysis.hardestDimension, 'Build')
    assert.strictEqual(paperAnalysis.easiestDimension, 'Recall')
    assert.ok(paperAnalysis.insights.some((txt) => txt.includes('Medium mastery (45%) is lower than Hard (60%)')))
  })

  it('accurately computes Dimension x Difficulty cross matrix with question splitting', () => {
    // Q1: Recall & Solve (6 marks = 3 Recall, 3 Solve), difficulty: easy
    // Q2: Recall (4 marks), difficulty: medium
    // Q3: Solve & Build (6 marks = 3 Solve, 3 Build), difficulty: hard
    const questions = [
      { id: 'Q1', difficulty: 'easy', dimensions: ['Recall', 'Solve'], marks: 6, dimensionMarks: { Recall: 3, Solve: 3 } },
      { id: 'Q2', difficulty: 'medium', dimensions: ['Recall'], marks: 4, dimensionMarks: { Recall: 4 } },
      { id: 'Q3', difficulty: 'hard', dimensions: ['Solve', 'Build'], marks: 6, dimensionMarks: { Solve: 3, Build: 3 } },
    ]

    // S1 scores: Q1=6 (Recall 3, Solve 3), Q2=2 (Recall 2), Q3=4 (Solve 2, Build 2) -> Total 12
    // S2 scores: Q1=3 (Recall 1.5, Solve 1.5), Q2=4 (Recall 4), Q3=2 (Solve 1, Build 1) -> Total 9
    const scores = {
      S1: { Q1: 6, Q2: 2, Q3: 4 },
      S2: { Q1: 3, Q2: 4, Q3: 2 },
    }

    const { paperAnalysis } = buildProfiles(questions, scores)
    const cm = paperAnalysis.crossMatrix
    assert.ok(cm)

    // Cell (Recall, easy): from Q1, availableMarks = 3
    // S1 earned 3, S2 earned 1.5 -> cohortEarnedAvg = 2.25
    // cohortMasteryPct = (2.25 / 3) * 100 = 75.0%
    const recallEasy = cm.cells.Recall.easy
    assert.strictEqual(recallEasy.questionCount, 1)
    assert.deepStrictEqual(recallEasy.questionIds, ['Q1'])
    assert.strictEqual(recallEasy.availableMarks, 3)
    assert.strictEqual(recallEasy.cohortEarnedAvg, 2.25)
    assert.strictEqual(recallEasy.cohortMasteryPct, 75.0)

    // Cell (Recall, medium): from Q2, availableMarks = 4
    // S1 earned 2, S2 earned 4 -> cohortEarnedAvg = 3.0
    // cohortMasteryPct = (3.0 / 4) * 100 = 75.0%
    const recallMedium = cm.cells.Recall.medium
    assert.strictEqual(recallMedium.questionCount, 1)
    assert.strictEqual(recallMedium.availableMarks, 4)
    assert.strictEqual(recallMedium.cohortEarnedAvg, 3.0)
    assert.strictEqual(recallMedium.cohortMasteryPct, 75.0)

    // Cell (Solve, hard): from Q3, availableMarks = 3
    // S1 earned 2, S2 earned 1 -> cohortEarnedAvg = 1.5
    // cohortMasteryPct = (1.5 / 3) * 100 = 50.0%
    const solveHard = cm.cells.Solve.hard
    assert.strictEqual(solveHard.questionCount, 1)
    assert.strictEqual(solveHard.availableMarks, 3)
    assert.strictEqual(solveHard.cohortEarnedAvg, 1.5)
    assert.strictEqual(solveHard.cohortMasteryPct, 50.0)

    // Cell (Build, hard): from Q3, availableMarks = 3
    const buildHard = cm.cells.Build.hard
    assert.strictEqual(buildHard.questionCount, 1)
    assert.strictEqual(buildHard.availableMarks, 3)
    assert.strictEqual(buildHard.cohortEarnedAvg, 1.5)
    assert.strictEqual(buildHard.cohortMasteryPct, 50.0)

    // Row totals: Recall availableMarks = 3 + 4 = 7
    // Cohort earned avg = 2.25 + 3.0 = 5.25
    assert.strictEqual(cm.rowTotals.Recall.availableMarks, 7)
    assert.strictEqual(cm.rowTotals.Recall.cohortEarnedAvg, 5.25)
    assert.strictEqual(cm.rowTotals.Recall.cohortMasteryPct, 75.0)
    assert.strictEqual(cm.rowTotals.Recall.questionCount, 2)

    // Col totals: easy availableMarks = 6, cohortEarnedAvg = (6 + 3) / 2 = 4.5
    assert.strictEqual(cm.colTotals.easy.availableMarks, 6)
    assert.strictEqual(cm.colTotals.easy.cohortEarnedAvg, 4.5)
    assert.strictEqual(cm.colTotals.easy.cohortMasteryPct, 75.0)

    // Grand total: 16 marks, cohort average = (12 + 9) / 2 = 10.5
    assert.strictEqual(cm.grandTotal.availableMarks, 16)
    assert.strictEqual(cm.grandTotal.questionCount, 3)
    assert.strictEqual(cm.grandTotal.cohortEarnedAvg, 10.5)
    assert.strictEqual(cm.grandTotal.cohortMasteryPct, 65.6)
  })

  it('handles edge cases: single student, zero marks, unattempted questions', () => {
    // 1. Single student
    const qSingle = [
      { id: 'Q1', difficulty: 'easy', dimensions: ['Recall'], marks: 10 },
      { id: 'Q2', difficulty: 'hard', dimensions: ['Build'], marks: 10 },
    ]
    const scoresSingle = {
      S_ONLY: { Q1: 10, Q2: 3 },
    }
    const resSingle = buildProfiles(qSingle, scoresSingle)
    assert.ok(resSingle.paperAnalysis)
    assert.strictEqual(resSingle.paperAnalysis.dimensions.Recall.meanPct, 100)
    assert.strictEqual(resSingle.paperAnalysis.dimensions.Recall.verdict, 'Very Easy')
    assert.strictEqual(resSingle.paperAnalysis.dimensions.Build.meanPct, 30)
    assert.strictEqual(resSingle.paperAnalysis.dimensions.Build.verdict, 'Very Difficult')
    assert.strictEqual(resSingle.paperAnalysis.hardestDimension, 'Build')
    assert.strictEqual(resSingle.paperAnalysis.easiestDimension, 'Recall')

    // 2. Unattempted questions
    const scoresUnattempted = {
      S1: { Q1: 10 },
    }
    const resUnattempted = buildProfiles(qSingle, scoresUnattempted)
    assert.strictEqual(resUnattempted.paperAnalysis.dimensions.Build.meanEarned, 0)
    assert.strictEqual(resUnattempted.paperAnalysis.dimensions.Build.meanPct, 0)
    assert.strictEqual(resUnattempted.paperAnalysis.dimensions.Build.verdict, 'Very Difficult')

    // 3. Zero marks / empty questions
    const resEmpty = buildProfiles([], {})
    assert.ok(resEmpty.paperAnalysis)
    assert.strictEqual(resEmpty.paperAnalysis.hardestDimension, null)
    assert.strictEqual(resEmpty.paperAnalysis.easiestDimension, null)
    assert.strictEqual(resEmpty.paperAnalysis.crossMatrix.grandTotal.availableMarks, 0)

    // 4. Direct call to computePaperAnalysis
    const directAnalysis = computePaperAnalysis(qSingle, scoresSingle)
    assert.ok(directAnalysis)
    assert.strictEqual(directAnalysis.hardestDimension, 'Build')
    assert.strictEqual(directAnalysis.easiestDimension, 'Recall')
  })

  it('computes contest overall score distribution irrespective of dimensions', () => {
    // 100 mark exam: 5 questions across 5 dimensions (20 marks each)
    const questions = [
      { id: 'Q1', marks: 20, dimensions: ['Recall'], difficulty: 'easy' },
      { id: 'Q2', marks: 20, dimensions: ['Comprehend'], difficulty: 'easy' },
      { id: 'Q3', marks: 20, dimensions: ['Solve'], difficulty: 'medium' },
      { id: 'Q4', marks: 20, dimensions: ['Build'], difficulty: 'hard' },
      { id: 'Q5', marks: 20, dimensions: ['Evaluate'], difficulty: 'challenge' },
    ]

    // 5 students with varied distribution across dimensions:
    // S1: 95/100 (95%) -> Q1=20, Q2=20, Q3=20, Q4=20, Q5=15
    // S2: 75/100 (75%) -> Q1=20, Q2=20, Q3=20, Q4=15, Q5=0
    // S3: 50/100 (50%) -> Q1=20, Q2=20, Q3=10, Q4=0, Q5=0
    // S4: 50/100 (50%) -> Q1=0, Q2=0, Q3=10, Q4=20, Q5=20 (Different dimensions from S3, same total!)
    // S5: 10/100 (10%) -> Q1=10, Q2=0, Q3=0, Q4=0, Q5=0
    const scores = {
      S1: { Q1: 20, Q2: 20, Q3: 20, Q4: 20, Q5: 15 },
      S2: { Q1: 20, Q2: 20, Q3: 20, Q4: 15, Q5: 0 },
      S3: { Q1: 20, Q2: 20, Q3: 10, Q4: 0, Q5: 0 },
      S4: { Q1: 0, Q2: 0, Q3: 10, Q4: 20, Q5: 20 },
      S5: { Q1: 10, Q2: 0, Q3: 0, Q4: 0, Q5: 0 },
    }

    const { paperAnalysis } = buildProfiles(questions, scores)
    assert.ok(paperAnalysis)
    const od = paperAnalysis.overallDistribution
    assert.ok(od, 'paperAnalysis.overallDistribution must exist')

    // Basic contest metrics
    assert.strictEqual(od.totalExamMarks, 100)
    assert.strictEqual(od.totalStudents, 5)

    // Scores: 95, 75, 50, 50, 10
    // Mean: (95 + 75 + 50 + 50 + 10) / 5 = 280 / 5 = 56.0%
    assert.strictEqual(od.meanPct, 56)
    assert.strictEqual(od.meanEarned, 56)
    // Sorted: 10, 50, 50, 75, 95 -> Median = 50.0%
    assert.strictEqual(od.medianPct, 50)
    assert.strictEqual(od.minPct, 10)
    assert.strictEqual(od.maxPct, 95)
    // StdDev: variance = ((10-56)^2 + (50-56)^2*2 + (75-56)^2 + (95-56)^2) / 5
    // = (2116 + 72 + 361 + 1521) / 5 = 4070 / 5 = 814. Math.sqrt(814) = 28.53
    assert.strictEqual(od.stdDevPct, 28.53)

    // Verdict for mean 56% is 'Balanced', tone 'neutral'
    assert.strictEqual(od.verdict, 'Balanced')
    assert.strictEqual(od.verdictTone, 'neutral')

    // Check decileBins (10 bins)
    assert.strictEqual(od.decileBins.length, 10)
    for (let i = 0; i < 10; i++) {
      const b = od.decileBins[i]
      assert.strictEqual(b.binIndex, i)
      assert.strictEqual(b.minPct, i * 10)
      assert.strictEqual(b.maxPct, (i + 1) * 10)
      assert.strictEqual(b.minMarks, i * 10)
      assert.strictEqual(b.maxMarks, (i + 1) * 10)
      assert.strictEqual(b.label, `${i * 10}-${(i + 1) * 10}%`)
    }

    // Bin 0: 0-10% -> S5 (10%) falls in bin 0
    assert.strictEqual(od.decileBins[0].count, 1)
    assert.deepStrictEqual(od.decileBins[0].studentIds, ['S5'])
    assert.strictEqual(od.decileBins[0].percentage, 20)

    // Bin 4: 40-50% -> S3 and S4 (both 50%) fall in bin 4 irrespective of differing dimensions!
    assert.strictEqual(od.decileBins[4].count, 2)
    assert.deepStrictEqual(od.decileBins[4].studentIds, ['S3', 'S4'])
    assert.strictEqual(od.decileBins[4].percentage, 40)

    // Bin 7: 70-80% -> S2 (75%)
    assert.strictEqual(od.decileBins[7].count, 1)
    assert.deepStrictEqual(od.decileBins[7].studentIds, ['S2'])

    // Bin 9: 90-100% -> S1 (95%)
    assert.strictEqual(od.decileBins[9].count, 1)
    assert.deepStrictEqual(od.decileBins[9].studentIds, ['S1'])

    // Check rawMarkBins (10 adaptive bins for 100 marks: 0-10, 10-20, ... 90-100)
    assert.strictEqual(od.rawMarkBins.length, 10)
    assert.strictEqual(od.rawMarkBins[0].label, '0-10')
    assert.strictEqual(od.rawMarkBins[0].count, 1)
    assert.deepStrictEqual(od.rawMarkBins[0].studentIds, ['S5'])

    // S3 and S4 both have 50 raw marks -> in bin 4 ('40-50')
    assert.strictEqual(od.rawMarkBins[4].label, '40-50')
    assert.strictEqual(od.rawMarkBins[4].count, 2)
    assert.deepStrictEqual(od.rawMarkBins[4].studentIds, ['S3', 'S4'])

    // S1 has 95 marks -> in bin 9 ('90-100')
    assert.strictEqual(od.rawMarkBins[9].label, '90-100')
    assert.strictEqual(od.rawMarkBins[9].count, 1)
    assert.deepStrictEqual(od.rawMarkBins[9].studentIds, ['S1'])

    // Also check direct call to computePaperAnalysis returns overallDistribution
    const directRes = computePaperAnalysis(questions, scores)
    assert.ok(directRes.overallDistribution)
    assert.strictEqual(directRes.overallDistribution.totalExamMarks, 100)
    assert.strictEqual(directRes.overallDistribution.meanPct, 56)
  })
})

describe('Question Solve Rates and Alignment Analysis', () => {
  describe('Expected Solve Rate Parsing in readExamConfig', () => {
    it('parses percentage strings with % symbol', () => {
      const rows = [
        { question_id: 'Q1', marks: 5, expected_solve_rate: '85%' },
        { question_id: 'Q2', marks: 5, expected_rate: '72.5%' },
        { question_id: 'Q3', marks: 5, expected_solve_pct: '100%' },
        { question_id: 'Q4', marks: 5, solve_rate_expected: '0%' },
      ]
      const { questions } = readExamConfig(rows)
      assert.strictEqual(questions[0].expectedSolveRate, 85)
      assert.strictEqual(questions[0].expectedRate, 85)
      assert.strictEqual(questions[1].expectedSolveRate, 72.5)
      assert.strictEqual(questions[2].expectedSolveRate, 100)
      assert.strictEqual(questions[3].expectedSolveRate, 0)
    })

    it('parses decimal values and scales decimals between 0 and 1.0 to 100', () => {
      const rows = [
        { question_id: 'Q1', marks: 5, expected_solve_rate: 0.75 },
        { question_id: 'Q2', marks: 5, expected_solve_rate: '0.6' },
        { question_id: 'Q3', marks: 5, expected_solve_rate: 1.0 },
        { question_id: 'Q4', marks: 5, expected_solve_rate: '0.05' },
      ]
      const { questions } = readExamConfig(rows)
      assert.strictEqual(questions[0].expectedSolveRate, 75)
      assert.strictEqual(questions[1].expectedSolveRate, 60)
      assert.strictEqual(questions[2].expectedSolveRate, 100)
      assert.strictEqual(questions[3].expectedSolveRate, 5)
    })

    it('parses direct integer and numeric string values without scaling if > 1.0', () => {
      const rows = [
        { question_id: 'Q1', marks: 5, expected_solve_rate: 85 },
        { question_id: 'Q2', marks: 5, expected_solve_rate: '50' },
        { question_id: 'Q3', marks: 5, expected_solve_rate: 0 },
      ]
      const { questions } = readExamConfig(rows)
      assert.strictEqual(questions[0].expectedSolveRate, 85)
      assert.strictEqual(questions[1].expectedSolveRate, 50)
      assert.strictEqual(questions[2].expectedSolveRate, 0)
    })

    it('returns null for missing, empty, or non-numeric values', () => {
      const rows = [
        { question_id: 'Q1', marks: 5 },
        { question_id: 'Q2', marks: 5, expected_solve_rate: '' },
        { question_id: 'Q3', marks: 5, expected_solve_rate: null },
        { question_id: 'Q4', marks: 5, expected_solve_rate: 'n/a' },
      ]
      const { questions } = readExamConfig(rows)
      assert.strictEqual(questions[0].expectedSolveRate, null)
      assert.strictEqual(questions[0].expectedRate, null)
      assert.strictEqual(questions[1].expectedSolveRate, null)
      assert.strictEqual(questions[2].expectedSolveRate, null)
      assert.strictEqual(questions[3].expectedSolveRate, null)
    })

    it('recognizes all supported column alias variations', () => {
      const rows = [
        { question_id: 'Q1', marks: 5, expected_solve_rate: '65%' },
        { question_id: 'Q2', marks: 5, expected_rate: '70%' },
        { question_id: 'Q3', marks: 5, expected_solve_pct: '75%' },
        { question_id: 'Q4', marks: 5, solve_rate_expected: '80%' },
        { question_id: 'Q5', marks: 5, expected_pct: '85%' },
        { question_id: 'Q6', marks: 5, target_solve_rate: '90%' },
        { question_id: 'Q7', marks: 5, expected_solve: '95%' },
      ]
      const { questions } = readExamConfig(rows)
      assert.strictEqual(questions[0].expectedSolveRate, 65)
      assert.strictEqual(questions[1].expectedSolveRate, 70)
      assert.strictEqual(questions[2].expectedSolveRate, 75)
      assert.strictEqual(questions[3].expectedSolveRate, 80)
      assert.strictEqual(questions[4].expectedSolveRate, 85)
      assert.strictEqual(questions[5].expectedSolveRate, 90)
      assert.strictEqual(questions[6].expectedSolveRate, 95)
    })
  })

  describe('computeQuestionSolveRates calculation', () => {
    it('calculates actual solve rates, deviations, and alignment accurately', () => {
      const questions = [
        { id: 'Q1', marks: 10, difficulty: 'easy', dimensions: ['Recall'], topic: 'Basics', expectedSolveRate: 75 },
        { id: 'Q2', marks: 10, difficulty: 'medium', dimensions: ['Solve'], topic: 'Algorithms', expectedSolveRate: 60 },
        { id: 'Q3', marks: 10, difficulty: 'hard', dimensions: ['Build'], topic: 'Systems', expectedSolveRate: 35 },
      ]

      // 10 students:
      // Q1: 8 students get 10 (full marks), 1 gets 5, 1 gets 0 -> 8/10 = 80.0% solve rate
      // Q2: 2 students get 10, 2 get 5, 6 unattempted -> 2/10 = 20.0% actual, 2/4 = 50.0% attempted solve rate
      // Q3: 9 students get 10, 1 gets 5 -> 9/10 = 90.0% solve rate
      const students = Array.from({ length: 10 }, (_, i) => ({ id: `S${i + 1}` }))
      const scores = {
        S1: { Q1: 10, Q2: 10, Q3: 10 },
        S2: { Q1: 10, Q2: 10, Q3: 10 },
        S3: { Q1: 10, Q2: 5, Q3: 10 },
        S4: { Q1: 10, Q2: 5, Q3: 10 },
        S5: { Q1: 10, Q3: 10 },
        S6: { Q1: 10, Q3: 10 },
        S7: { Q1: 10, Q3: 10 },
        S8: { Q1: 10, Q3: 10 },
        S9: { Q1: 5, Q3: 10 },
        S10: { Q1: 0, Q3: 5 },
      }

      const res = computeQuestionSolveRates(questions, scores, students, 30)

      assert.strictEqual(res.totalQuestions, 3)
      assert.strictEqual(res.questions.length, 3)

      // Q1 checks
      const q1 = res.questions[0]
      assert.strictEqual(q1.id, 'Q1')
      assert.strictEqual(q1.totalStudents, 10)
      assert.strictEqual(q1.attemptedCount, 10)
      assert.strictEqual(q1.solvedCount, 8)
      assert.strictEqual(q1.actualSolveRate, 80.0)
      assert.strictEqual(q1.attemptedSolveRate, 80.0)
      assert.strictEqual(q1.totalEarned, 85) // 8*10 + 5 + 0
      assert.strictEqual(q1.meanEarned, 8.5)
      assert.strictEqual(q1.meanScorePct, 85.0)
      assert.strictEqual(q1.expectedSolveRate, 75)
      assert.strictEqual(q1.hasExplicitExpectedRate, true)
      assert.strictEqual(q1.deviation, 5.0) // 80 - 75
      assert.strictEqual(q1.scoreDeviation, 10.0) // 85 - 75
      assert.strictEqual(q1.alignment, 'on-target')
      assert.strictEqual(q1.alignmentLabel, 'On Target')
      assert.strictEqual(q1.isHighDeviation, false)

      // Q2 checks
      const q2 = res.questions[1]
      assert.strictEqual(q2.id, 'Q2')
      assert.strictEqual(q2.attemptedCount, 4)
      assert.strictEqual(q2.solvedCount, 2)
      assert.strictEqual(q2.actualSolveRate, 20.0) // 2 / 10
      assert.strictEqual(q2.attemptedSolveRate, 50.0) // 2 / 4
      assert.strictEqual(q2.totalEarned, 30) // 2*10 + 2*5
      assert.strictEqual(q2.meanEarned, 3.0) // 30 / 10
      assert.strictEqual(q2.meanScorePct, 30.0)
      assert.strictEqual(q2.expectedSolveRate, 60)
      assert.strictEqual(q2.deviation, -40.0) // 20 - 60
      assert.strictEqual(q2.scoreDeviation, -30.0) // 30 - 60
      assert.strictEqual(q2.alignment, 'much-harder')
      assert.strictEqual(q2.alignmentLabel, 'Much Harder Than Expected')
      assert.strictEqual(q2.isHighDeviation, true) // |-40| >= 20

      // Q3 checks
      const q3 = res.questions[2]
      assert.strictEqual(q3.id, 'Q3')
      assert.strictEqual(q3.attemptedCount, 10)
      assert.strictEqual(q3.solvedCount, 9)
      assert.strictEqual(q3.actualSolveRate, 90.0)
      assert.strictEqual(q3.expectedSolveRate, 35)
      assert.strictEqual(q3.deviation, 55.0) // 90 - 35
      assert.strictEqual(q3.alignment, 'much-easier')
      assert.strictEqual(q3.alignmentLabel, 'Much Easier Than Expected')
      assert.strictEqual(q3.isHighDeviation, true) // |55| >= 20

      // Summary checks
      assert.strictEqual(res.alignedCount, 1)
      assert.strictEqual(res.muchHarderCount, 1)
      assert.strictEqual(res.muchEasierCount, 1)
      assert.strictEqual(res.alignmentRate, 33.3) // 1/3
      assert.strictEqual(res.avgAbsDeviation, 33.3) // (5 + 40 + 55) / 3 = 100 / 3 = 33.3
      assert.strictEqual(res.maxHarderSurprise.id, 'Q2')
      assert.strictEqual(res.maxEasierSurprise.id, 'Q3')
      assert.strictEqual(res.highDeviationAlerts.length, 2)
      assert.deepStrictEqual(res.highDeviationAlerts.map((q) => q.id), ['Q2', 'Q3'])
    })

    it('falls back to default expected rates based on difficulty tier when expectedSolveRate is null', () => {
      const questions = [
        { id: 'Q1', marks: 10, difficulty: 'beginner' },
        { id: 'Q2', marks: 10, difficulty: 'easy' },
        { id: 'Q3', marks: 10, difficulty: 'medium' },
        { id: 'Q4', marks: 10, difficulty: 'hard' },
        { id: 'Q5', marks: 10, difficulty: 'challenge' },
      ]

      const res = computeQuestionSolveRates(questions, {}, [])
      assert.strictEqual(res.questions[0].expectedSolveRate, 85)
      assert.strictEqual(res.questions[0].hasExplicitExpectedRate, false)
      assert.strictEqual(res.questions[1].expectedSolveRate, 75)
      assert.strictEqual(res.questions[2].expectedSolveRate, 55)
      assert.strictEqual(res.questions[3].expectedSolveRate, 35)
      assert.strictEqual(res.questions[4].expectedSolveRate, 20)
    })

    it('correctly handles boundary conditions: empty questions, zero attempts, floating marks', () => {
      // Empty questions
      const emptyRes = computeQuestionSolveRates([], {}, [])
      assert.strictEqual(emptyRes.totalQuestions, 0)
      assert.strictEqual(emptyRes.alignedCount, 0)
      assert.strictEqual(emptyRes.alignmentRate, 0)
      assert.strictEqual(emptyRes.avgAbsDeviation, 0)
      assert.strictEqual(emptyRes.maxHarderSurprise, null)
      assert.strictEqual(emptyRes.maxEasierSurprise, null)
      assert.deepStrictEqual(emptyRes.highDeviationAlerts, [])

      // Unattempted question
      const unattemptedQ = [{ id: 'Q1', marks: 5, difficulty: 'medium', expectedSolveRate: 50 }]
      const unRes = computeQuestionSolveRates(unattemptedQ, { S1: {} }, ['S1'])
      assert.strictEqual(unRes.questions[0].attemptedCount, 0)
      assert.strictEqual(unRes.questions[0].solvedCount, 0)
      assert.strictEqual(unRes.questions[0].actualSolveRate, 0)
      assert.strictEqual(unRes.questions[0].attemptedSolveRate, null)
      assert.strictEqual(unRes.questions[0].meanEarned, 0)
      assert.strictEqual(unRes.questions[0].deviation, -50.0)
      assert.strictEqual(unRes.questions[0].alignment, 'much-harder')
      assert.strictEqual(unRes.questions[0].isHighDeviation, true)
    })
  })

  describe('Full Integration Test with Datasets', () => {
    it('integrates question-wise solve rate analysis with 20-question sample exam', async () => {
      const samples = getSamples()
      const qParsed = await parseCsv(samples.examConfig)
      const sParsed = await parseCsv(samples.students)
      const scParsed = await parseCsv(samples.studentScores)

      const { questions } = readExamConfig(qParsed)
      assert.strictEqual(questions.length, 20)
      // All questions have expectedSolveRate parsed from the CSV
      for (const q of questions) {
        assert.ok(q.expectedSolveRate !== null, `Question ${q.id} should have expectedSolveRate`)
        assert.ok(typeof q.expectedSolveRate === 'number')
      }

      const { students: studentInfo } = readStudentInfo(sParsed)
      const { scores } = readStudentScores(scParsed, questions)

      const analysis = buildProfiles(questions, scores, studentInfo)
      const paperAnalysis = analysis.paperAnalysis

      assert.ok(paperAnalysis.questionSolveRates)
      assert.strictEqual(paperAnalysis.questionAnalysis, paperAnalysis.questionSolveRates)

      const qsr = paperAnalysis.questionSolveRates
      assert.strictEqual(qsr.totalQuestions, 20)
      assert.strictEqual(qsr.questions.length, 20)
      assert.ok(qsr.alignmentRate >= 0 && qsr.alignmentRate <= 100)
      assert.ok(qsr.avgAbsDeviation >= 0)
      assert.ok(qsr.maxHarderSurprise)
      assert.ok(qsr.maxEasierSurprise)
      assert.ok(Array.isArray(qsr.highDeviationAlerts))

      // Verify structure of each question in analysis
      for (const q of qsr.questions) {
        assert.ok(q.id)
        assert.strictEqual(typeof q.actualSolveRate, 'number')
        assert.strictEqual(typeof q.expectedSolveRate, 'number')
        assert.strictEqual(typeof q.deviation, 'number')
        assert.ok(['much-easier', 'much-harder', 'on-target'].includes(q.alignment))
        assert.ok(['Much Easier Than Expected', 'Much Harder Than Expected', 'On Target'].includes(q.alignmentLabel))
        assert.strictEqual(typeof q.isHighDeviation, 'boolean')
      }
    })

    it('integrates question-wise solve rate analysis with 300-student contest dataset', async () => {
      const samples = getSamples()
      const qParsed = await parseCsv(samples.contestExamConfig)
      const sParsed = await parseCsv(samples.contestStudents)
      const scParsed = await parseCsv(samples.contestStudentScores)

      const { questions } = readExamConfig(qParsed)
      assert.strictEqual(questions.length, 25)

      for (const q of questions) {
        assert.ok(q.expectedSolveRate !== null, `Contest question ${q.id} should have expectedSolveRate`)
        assert.ok(q.expectedSolveRate >= 15 && q.expectedSolveRate <= 90)
      }

      const { students: studentInfo } = readStudentInfo(sParsed)
      const { scores } = readStudentScores(scParsed, questions)

      const analysis = buildProfiles(questions, scores, studentInfo)
      const qsr = analysis.paperAnalysis.questionSolveRates

      assert.ok(qsr)
      assert.strictEqual(qsr.totalQuestions, 25)
      assert.strictEqual(qsr.questions.length, 25)

      // Verify that all 300 students are accounted for in totalStudents
      for (const q of qsr.questions) {
        assert.strictEqual(q.totalStudents, 300)
        assert.ok(q.actualSolveRate >= 0 && q.actualSolveRate <= 100)
        if (q.attemptedCount > 0) {
          assert.ok(q.attemptedSolveRate >= 0 && q.attemptedSolveRate <= 100)
        }
      }

      // Check that summary metrics add up
      assert.strictEqual(qsr.alignedCount + qsr.muchHarderCount + qsr.muchEasierCount, 25)
      assert.strictEqual(qsr.highDeviationAlerts.length, qsr.questions.filter((q) => q.isHighDeviation).length)
    })
  })
})



import { simulateExpectedCohort } from '../src/profile.js'

describe('Expectations vs Reality Monte Carlo Simulation', () => {
  it('returns null for empty questions', () => {
    const result = simulateExpectedCohort([], {}, [], null, {})
    assert.strictEqual(result, null)
  })

  it('returns null when total marks is zero', () => {
    const qs = [{ id: 'Q1', marks: 0, dimensions: ['Recall'], difficulty: 'easy', expectedSolveRate: 70 }]
    const result = simulateExpectedCohort(qs, {}, [], null, {})
    assert.strictEqual(result, null)
  })

  it('simulates expected cohort with basic questions', () => {
    const qs = [
      { id: 'Q1', marks: 5, type: 'MCQ', dimensions: ['Recall'], difficulty: 'easy', topic: 'Basics', expectedSolveRate: 80 },
      { id: 'Q2', marks: 5, type: 'MCQ', dimensions: ['Solve'], difficulty: 'medium', topic: 'Logic', expectedSolveRate: 55 },
      { id: 'Q3', marks: 10, type: 'Coding', dimensions: ['Build'], difficulty: 'hard', topic: 'Implementation', expectedSolveRate: 35 },
    ]
    const result = simulateExpectedCohort(qs, {}, [], null, { cohortSize: 200 })

    assert.ok(result !== null)
    assert.ok(result.expectedCohort)
    assert.strictEqual(result.expectedCohort.cohortSize, 200)
    assert.strictEqual(result.expectedCohort.totalExam, 20)
    assert.ok(result.expectedCohort.meanPct >= 0 && result.expectedCohort.meanPct <= 100)
    assert.ok(result.expectedCohort.medianPct >= 0 && result.expectedCohort.medianPct <= 100)
    assert.ok(result.expectedCohort.stdDevPct >= 0)
  })

  it('produces expectedDecileBins sorted descending (90-100% first)', () => {
    const qs = [
      { id: 'Q1', marks: 10, type: 'MCQ', dimensions: ['Recall'], difficulty: 'easy', topic: 'T1', expectedSolveRate: 75 },
    ]
    const result = simulateExpectedCohort(qs, {}, [], null, { cohortSize: 100 })
    assert.ok(result.expectedDecileBins)
    assert.strictEqual(result.expectedDecileBins.length, 10)
    // First bin should be 90-100% (highest)
    assert.strictEqual(result.expectedDecileBins[0].label, '90-100%')
    // Last bin should be 0-10% (lowest)
    assert.strictEqual(result.expectedDecileBins[9].label, '0-10%')
    // All bins sum to cohortSize
    const totalCount = result.expectedDecileBins.reduce((s, b) => s + b.count, 0)
    assert.strictEqual(totalCount, 100)
  })

  it('produces expectedRawMarkBins sorted descending', () => {
    const qs = [
      { id: 'Q1', marks: 20, type: 'MCQ', dimensions: ['Recall'], difficulty: 'easy', topic: 'T1', expectedSolveRate: 70 },
    ]
    const result = simulateExpectedCohort(qs, {}, [], null, { cohortSize: 50 })
    assert.ok(result.expectedRawMarkBins)
    assert.ok(result.expectedRawMarkBins.length > 0)
    // First bin max should be higher than last bin max (descending)
    assert.ok(result.expectedRawMarkBins[0].maxMark >= result.expectedRawMarkBins[result.expectedRawMarkBins.length - 1].maxMark)
  })

  it('computes expectedDimensions for present dimensions', () => {
    const qs = [
      { id: 'Q1', marks: 10, type: 'MCQ', dimensions: ['Recall'], difficulty: 'easy', topic: 'T1', expectedSolveRate: 80 },
      { id: 'Q2', marks: 10, type: 'MCQ', dimensions: ['Solve'], difficulty: 'medium', topic: 'T2', expectedSolveRate: 50 },
    ]
    const result = simulateExpectedCohort(qs, {}, [], null, { cohortSize: 100 })
    assert.ok(result.expectedDimensions)
    assert.ok(result.expectedDimensions['Recall'])
    assert.ok(result.expectedDimensions['Solve'])
    // Recall (80% expected) should have higher mastery than Solve (50%)
    assert.ok(result.expectedDimensions['Recall'].expectedMasteryPct > result.expectedDimensions['Solve'].expectedMasteryPct)
  })

  it('computes overallGap when cohort stats are provided', () => {
    const qs = [
      { id: 'Q1', marks: 10, type: 'MCQ', dimensions: ['Recall'], difficulty: 'easy', topic: 'T1', expectedSolveRate: 70 },
    ]
    const mockCohort = { meanPct: 60, medianPct: 62, dimensions: {}, decileBins: [] }
    const result = simulateExpectedCohort(qs, {}, [], mockCohort, { cohortSize: 100 })
    assert.ok(result.overallGap)
    assert.ok(result.overallGap.meanGap !== undefined)
    assert.ok(result.overallGap.medianGap !== undefined)
    assert.ok(typeof result.overallGap.divergenceScore === 'number')
  })

  it('generates comparisonBins sorted descending matching decile bins', () => {
    const qs = [
      { id: 'Q1', marks: 10, type: 'MCQ', dimensions: ['Recall'], difficulty: 'medium', topic: 'T1', expectedSolveRate: 60 },
    ]
    const mockDecileBins = Array.from({ length: 10 }, (_, i) => ({
      label: `${i * 10}-${(i + 1) * 10}%`, count: 10, percentage: 10, minPct: i * 10, maxPct: (i + 1) * 10
    }))
    const mockCohort = { meanPct: 55, medianPct: 58, dimensions: {}, decileBins: mockDecileBins }
    const result = simulateExpectedCohort(qs, {}, [], mockCohort, { cohortSize: 100 })
    assert.strictEqual(result.comparisonBins.length, 10)
    assert.strictEqual(result.comparisonBins[0].label, '90-100%')
    assert.strictEqual(result.comparisonBins[9].label, '0-10%')
    for (const bin of result.comparisonBins) {
      assert.ok('expectedCount' in bin)
      assert.ok('expectedPct' in bin)
      assert.ok('actualCount' in bin)
      assert.ok('actualPct' in bin)
      assert.ok('deltaPct' in bin)
    }
  })

  it('classifies dimension gaps as critical-deficit, moderate-deficit, aligned, or exceeded', () => {
    const qs = [
      { id: 'Q1', marks: 10, type: 'MCQ', dimensions: ['Recall'], difficulty: 'easy', topic: 'T1', expectedSolveRate: 80 },
      { id: 'Q2', marks: 10, type: 'MCQ', dimensions: ['Solve'], difficulty: 'medium', topic: 'T2', expectedSolveRate: 60 },
    ]
    // Recall: expected ~80%, actual ~20% → critical deficit
    // Solve: expected ~60%, actual ~65% → aligned or exceeded
    const mockDimensions = {
      Recall: { meanPct: 20, masteryPct: 20 },
      Solve: { meanPct: 65, masteryPct: 65 }
    }
    const mockCohort = { meanPct: 42, medianPct: 42, dimensions: mockDimensions, decileBins: [] }
    const result = simulateExpectedCohort(qs, {}, [], mockCohort, { cohortSize: 50 })
    assert.ok(result.dimensionGaps)
    assert.ok(result.dimensionGaps['Recall'])
    assert.strictEqual(result.dimensionGaps['Recall'].status, 'critical-deficit')
    assert.ok(result.dimensionGaps['Recall'].recommendation.includes('Recall'))
  })

  it('generates pedagogical insights array', () => {
    const qs = [
      { id: 'Q1', marks: 10, type: 'MCQ', dimensions: ['Recall'], difficulty: 'easy', topic: 'T1', expectedSolveRate: 75 },
    ]
    const mockCohort = { meanPct: 55, medianPct: 57, dimensions: {}, decileBins: [] }
    const result = simulateExpectedCohort(qs, {}, [], mockCohort, { cohortSize: 100 })
    assert.ok(Array.isArray(result.insights))
  })

  it('integrates with full contest dataset via buildProfiles', async () => {
    const { getSamples } = await import('../server/storage.js')
    const samples = getSamples()
    const { parseCsv: _parseCsv, readExamConfig: _readExamConfig, readStudentInfo: _readStudentInfo, readStudentScores: _readStudentScores, buildProfiles: _buildProfiles } = await import('../src/profile.js')

    const qParsed = await _parseCsv(samples.contestExamConfig)
    const sParsed = await _parseCsv(samples.contestStudents)
    const scParsed = await _parseCsv(samples.contestStudentScores)
    const { questions } = _readExamConfig(qParsed)
    const { students: studentInfo } = _readStudentInfo(sParsed)
    const { scores } = _readStudentScores(scParsed, questions)

    const analysis = _buildProfiles(questions, scores, studentInfo)
    const sim = analysis.paperAnalysis.expectedSimulation

    assert.ok(sim !== null, 'expectedSimulation should be populated')
    assert.ok(sim.expectedCohort)
    assert.ok(sim.expectedCohort.cohortSize === 300)
    assert.ok(sim.expectedCohort.totalExam === 100)
    assert.ok(sim.expectedCohort.meanPct >= 0 && sim.expectedCohort.meanPct <= 100)
    assert.ok(sim.expectedDecileBins.length === 10)
    assert.strictEqual(sim.expectedDecileBins[0].label, '90-100%')
    assert.ok(sim.comparisonBins.length === 10)
    assert.ok(Array.isArray(sim.insights))
    assert.ok(sim.overallGap)
    assert.ok(typeof sim.overallGap.divergenceScore === 'number')
    // Topic gaps should be populated since students/scores are passed
    assert.ok(Object.keys(sim.topicGaps).length > 0)
  })
})
