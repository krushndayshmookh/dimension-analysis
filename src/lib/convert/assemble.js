import { DIFFICULTIES } from '../constants.js'
import { issue } from './common.js'

// Bringing the sheets together into the three import files. Each score sheet
// is optional; with only one of them the result is that sheet's own exam.

const KINDS = {
  quiz: { type: 'assessment', label: 'quiz' },
  coding: { type: 'assignment', label: 'coding' },
}
const MARKS_DECIMALS = 4
const round = (value) => Math.round(value * 10 ** MARKS_DECIMALS) / 10 ** MARKS_DECIMALS

export const CONFIG_COLUMNS = ['question_id', 'question_type', 'question_difficulty', 'question_dimension', 'question_topics', 'marks', 'expected_solve_rate']
export const STUDENT_COLUMNS = ['student_id', 'student_name', 'section', 'attendance']

const configRow = (kind, id, fields, marks, problems) => ({
  key: `${kind}:${id}`,
  kind,
  question_id: id,
  question_type: KINDS[kind].type,
  question_difficulty: fields.difficulty,
  question_dimension: fields.dimensions.join(';'),
  question_topics: fields.topics.join(';'),
  marks,
  expected_solve_rate: fields.expectedSolveRate,
  problems,
})

// The set (A, B, ...) of the listing whose questions the sheets contain most of.
function bestSet(listingQuestions, ids) {
  const counts = new Map()
  for (const q of listingQuestions) if (q.set && ids.has(q.id)) counts.set(q.set, (counts.get(q.set) ?? 0) + 1)
  let best = null
  for (const [set, count] of counts) if (!best || count > counts.get(best)) best = set
  return best
}

const marksEach = (total, count) => (count > 0 && Number(total) > 0 ? round(Number(total) / count) : '')

// listing, coding, quiz, enrolled: results of the readers, or null when that
// sheet was not given. totalMarks: { coding, quiz } the marks of all questions
// of that kind together.
export function assembleExam({ listing, coding, quiz, enrolled, totalMarks, addMissingEnrolled = true }) {
  const issues = []
  const listed = new Map((listing?.questions ?? []).map((q) => [q.id, q]))
  const sheets = [
    quiz && { kind: 'quiz', data: quiz },
    coding && { kind: 'coding', data: coding },
  ].filter(Boolean)
  for (const { data } of sheets) issues.push(...data.issues)
  if (enrolled) issues.push(...enrolled.issues)

  // Order within a sheet: quiz by question_no (already sorted), coding as listed.
  const orderOf = (kind, questions) => {
    if (kind !== 'coding' || !listing) return questions
    const position = new Map(listing.questions.map((q, i) => [q.id, i]))
    return [...questions].sort((a, b) => (position.get(a.id) ?? Infinity) - (position.get(b.id) ?? Infinity))
  }

  const sheetIds = new Set(sheets.flatMap(({ data }) => data.questions.map((q) => q.id)))
  const setOf = (ids) => bestSet(listing?.questions ?? [], ids)
  const set = setOf(sheetIds)
  const sheetSets = sheets.map(({ data }) => setOf(new Set(data.questions.map((q) => q.id)))).filter(Boolean)
  if (new Set(sheetSets).size > 1) issues.push(issue('warning', `The score sheets seem to belong to different sets (${[...new Set(sheetSets)].join(', ')})`))

  const config = []
  for (const { kind, data } of sheets) {
    const questions = orderOf(kind, data.questions)
    const marks = marksEach(totalMarks?.[kind], questions.length)
    for (const q of questions) {
      const known = listed.get(q.id)
      if (known) {
        if (known.type && known.type !== KINDS[kind].type) {
          issues.push(issue('warning', `Question ${q.id} is a ${KINDS[kind].label} question here, but the listing gives its type as ${known.type}`))
        }
        config.push(configRow(kind, q.id, known, marks, [...known.problems.filter((p) => p !== 'no set')]))
      } else {
        const difficulty = String(q.difficulty ?? '').toLowerCase()
        const fields = { difficulty: DIFFICULTIES.includes(difficulty) ? difficulty : '', dimensions: [], topics: [], expectedSolveRate: '' }
        config.push(configRow(kind, q.id, fields, marks, ['not in the listing']))
        issues.push(issue('warning', `Question ${q.id} is not in the listing: fill in its dimension and topics`))
      }
    }
  }

  // Listing rows that did not become questions.
  const wantedTypes = new Set(sheets.map(({ kind }) => KINDS[kind].type))
  const hasSets = (listing?.questions ?? []).some((q) => q.set)
  const extras = []
  for (const q of listing?.questions ?? []) {
    if (sheetIds.has(q.id)) continue
    let reason = null
    if (!hasSets || set === null) reason = wantedTypes.has(q.type) ? 'not in the score sheets' : null
    else if (!q.set) reason = !q.type || wantedTypes.has(q.type) ? 'has no set' : null
    else if (q.set === set && wantedTypes.has(q.type)) reason = `in set ${set} but not in the score sheets`
    if (!reason) continue
    const kind = q.type === 'assignment' ? 'coding' : 'quiz'
    extras.push({ ...configRow(kind, q.id, q, '', q.problems.filter((p) => p !== 'no set')), reason, listingRow: q.row })
  }
  if (extras.length) issues.push(issue('info', `${extras.length} listing row(s) are not part of the exam; they are listed so you can add them`))

  // Students.
  const byId = new Map()
  for (const { data } of sheets) {
    for (const s of data.students) {
      const known = byId.get(s.id)
      if (known) known.absent &&= s.absent
      else byId.set(s.id, { id: s.id, name: s.name, absent: s.absent })
    }
  }
  if (enrolled) {
    const enrolledIds = new Set(enrolled.students.map((s) => s.id))
    for (const s of enrolled.students) if (byId.has(s.id)) byId.get(s.id).name = s.name || byId.get(s.id).name
    const notEnrolled = [...byId.keys()].filter((id) => !enrolledIds.has(id))
    if (notEnrolled.length) issues.push(issue('warning', `${notEnrolled.length} scored student(s) not in the enrolled list: ${notEnrolled.join(', ')}`))
    const missing = enrolled.students.filter((s) => !byId.has(s.id))
    if (missing.length && addMissingEnrolled) {
      for (const s of missing) byId.set(s.id, { id: s.id, name: s.name, absent: true })
      issues.push(issue('info', `${missing.length} enrolled student(s) have no rows in the score sheets and were added as absent: ${missing.map((s) => s.id).join(', ')}`))
    } else if (missing.length) {
      issues.push(issue('info', `${missing.length} enrolled student(s) have no rows in the score sheets and were left out`))
    }
  }

  const fractions = {}
  for (const { data } of sheets) for (const [id, cells] of Object.entries(data.fractions)) fractions[id] = { ...fractions[id], ...cells }

  return { set, config, extras, students: [...byId.values()], fractions, issues }
}

export const extraToConfig = (extra, marks) => {
  const { reason, listingRow, ...row } = extra
  return { ...row, marks }
}

export const configTable = (config) => ({ columns: CONFIG_COLUMNS, rows: config })

// Scores are stored as the fraction of a question earned, so editing the marks
// of a question rescales its scores.
export function scoresTable(config, students, fractions) {
  const columns = ['student_id', ...config.map((r) => r.question_id)]
  const rows = students.map((s) => {
    const row = { student_id: s.id }
    for (const q of config) {
      const fraction = fractions[s.id]?.[q.question_id]
      row[q.question_id] = fraction == null || !(Number(q.marks) > 0) ? '' : round(fraction * Number(q.marks))
    }
    return row
  })
  return { columns, rows }
}

export const studentsTable = (students) => ({
  columns: STUDENT_COLUMNS,
  rows: students.map((s) => ({ student_id: s.id, student_name: s.name || s.id, section: '', attendance: s.absent ? 'absent' : 'present' })),
})
