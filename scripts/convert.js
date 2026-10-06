// Converts the analytics team's sheets into the files the app imports: students.csv (the
// cohort), exam_config.csv, student_scores.csv and attendance.csv.
//
//   node scripts/convert.js --listing questions.csv --coding coding.csv --quiz quiz.csv \
//     --enrolled enrolled.csv --coding-marks 60 --quiz-marks 40 --out out [--combined]
//
// Each score sheet is optional. Without --combined, every score sheet is
// written to its own folder (out/coding, out/quiz); with it, both go into one exam.
// Problems found in the sheets are printed; the files are written regardless.
import fs from 'fs'
import path from 'path'
import { parseCsv } from '../src/lib/csv.js'
import { detectSheet, SHEET_LABELS } from '../src/lib/convert/detect.js'
import { readListing } from '../src/lib/convert/listing.js'
import { readCoding } from '../src/lib/convert/coding.js'
import { readQuiz } from '../src/lib/convert/quiz.js'
import { readEnrolled } from '../src/lib/convert/enrolled.js'
import { assembleExam, attendanceTable, configTable, scoresTable, studentsTable } from '../src/lib/convert/assemble.js'
import { toCsv } from '../src/lib/convert/common.js'

const READERS = { listing: readListing, coding: readCoding, quiz: readQuiz, enrolled: readEnrolled }
const FLAGS = { '--listing': 'listing', '--coding': 'coding', '--quiz': 'quiz', '--enrolled': 'enrolled' }

function parseArgs(argv) {
  const args = { files: {}, totalMarks: {}, out: 'converted', combined: false }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    if (flag in FLAGS) args.files[FLAGS[flag]] = argv[++i]
    else if (flag === '--coding-marks') args.totalMarks.coding = Number(argv[++i])
    else if (flag === '--quiz-marks') args.totalMarks.quiz = Number(argv[++i])
    else if (flag === '--out') args.out = argv[++i]
    else if (flag === '--combined') args.combined = true
    else throw new Error(`Unknown option ${flag}`)
  }
  return args
}

async function readSheet(expected, file) {
  const parsed = await parseCsv(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''))
  const detected = detectSheet(parsed.meta.fields)
  if (detected !== expected) throw new Error(`${file} does not look like the ${SHEET_LABELS[expected]} sheet (detected: ${SHEET_LABELS[detected] ?? 'unknown'})`)
  return READERS[expected](parsed)
}

function write(dir, exam) {
  fs.mkdirSync(dir, { recursive: true })
  const config = configTable(exam.config)
  const scores = scoresTable(exam.config, exam.students, exam.fractions)
  const students = studentsTable(exam.students)
  const attendance = attendanceTable(exam.students)
  fs.writeFileSync(path.join(dir, 'exam_config.csv'), toCsv(config.rows, config.columns))
  fs.writeFileSync(path.join(dir, 'student_scores.csv'), toCsv(scores.rows, scores.columns))
  fs.writeFileSync(path.join(dir, 'students.csv'), toCsv(students.rows, students.columns))
  fs.writeFileSync(path.join(dir, 'attendance.csv'), toCsv(attendance.rows, attendance.columns))
  console.log(`\n${dir}: ${exam.config.length} questions, ${exam.students.length} students (${exam.students.filter((s) => s.absent).length} absent)${exam.set ? `, set ${exam.set}` : ''}`)
  for (const row of exam.config) if (row.problems.length) console.log(`  needs attention: question ${row.question_id}: ${row.problems.join('; ')}`)
  for (const { level, text } of exam.issues) console.log(`  ${level}: ${text}`)
  for (const extra of exam.extras) console.log(`  not included: listing row ${extra.listingRow} (${extra.question_id}) ${extra.reason}`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const parts = {}
  for (const [name, file] of Object.entries(args.files)) parts[name] = await readSheet(name, file)
  if (!parts.coding && !parts.quiz) throw new Error('Give at least one of --coding and --quiz')
  for (const kind of ['coding', 'quiz']) {
    if (parts[kind] && !(args.totalMarks[kind] > 0)) throw new Error(`Give the total marks of the ${kind} questions with --${kind}-marks`)
  }
  const base = { listing: parts.listing ?? null, enrolled: parts.enrolled ?? null, totalMarks: args.totalMarks }
  if (args.combined || !(parts.coding && parts.quiz)) {
    write(args.out, assembleExam({ ...base, coding: parts.coding ?? null, quiz: parts.quiz ?? null }))
  } else {
    write(path.join(args.out, 'coding'), assembleExam({ ...base, coding: parts.coding, quiz: null }))
    write(path.join(args.out, 'quiz'), assembleExam({ ...base, coding: null, quiz: parts.quiz }))
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
