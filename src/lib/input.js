import { DIMENSIONS, DIFFICULTIES, QUESTION_TYPES, QUESTION_SUBTYPES, LIST_SEPARATOR } from './constants.js'

// Strict readers for the three input files. Anything that does not follow the
// documented format is reported in `errors`; callers must reject the upload
// when `errors` is not empty. `warnings` never block an upload.
//
// Each reader takes a parsed CSV ({ data, errors, meta: { fields } }).

const MAX_ERRORS = 100
const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/
const OPTION_PATTERN = /^[A-Za-z0-9_-]{1,20}$/
const EPSILON = 1e-9

function collector() {
  const errors = []
  let truncated = false
  return {
    errors,
    add(message) {
      if (errors.length < MAX_ERRORS) errors.push(message)
      else truncated = true
    },
    finish() {
      if (truncated) errors.push(`More than ${MAX_ERRORS} errors; fix these and upload again to see the rest.`)
      return errors
    },
  }
}

const normalizeName = (name) => String(name ?? '').trim().toLowerCase()

function normalizeRow(row) {
  const out = {}
  for (const [key, value] of Object.entries(row)) out[normalizeName(key)] = String(value ?? '').trim()
  return out
}

function checkStructure(label, parsed, requiredColumns, optionalColumns, errors) {
  const fields = (parsed?.meta?.fields ?? []).map(normalizeName)
  const missing = requiredColumns.filter((c) => !fields.includes(c))
  if (missing.length) errors.add(`${label}: missing required column(s): ${missing.join(', ')}`)
  const seen = new Set()
  for (const f of fields) {
    if (seen.has(f)) errors.add(`${label}: column "${f}" appears more than once`)
    seen.add(f)
  }
  for (const e of parsed?.errors ?? []) {
    if (e.type === 'FieldMismatch') errors.add(`${label}: data row ${(e.row ?? 0) + 1}: ${e.message}`)
  }
  const known = new Set([...requiredColumns, ...optionalColumns])
  const extra = fields.filter((f) => !known.has(f))
  return { fields, missing, extra }
}

function parseList(value) {
  return value.split(LIST_SEPARATOR).map((part) => part.trim())
}

const ATTENDANCE_VALUES = ['present', 'absent']

const CONFIG_REQUIRED = ['question_id', 'question_type', 'question_difficulty', 'question_dimension', 'marks']
const CONFIG_OPTIONAL = ['question_topics', 'expected_solve_rate', 'correct_option', 'question_subtype']

export function readExamConfig(parsed) {
  const label = 'Exam config'
  const out = collector()
  const warnings = []
  const questions = []
  const { missing, extra } = checkStructure(label, parsed, CONFIG_REQUIRED, CONFIG_OPTIONAL, out)
  if (extra.length) warnings.push(`${label}: ignoring unknown column(s): ${extra.join(', ')}`)

  if (!missing.length) {
    const seenIds = new Set()
    ;(parsed.data ?? []).forEach((rawRow, i) => {
      const row = normalizeRow(rawRow)
      const where = `${label}: row ${i + 1}${row.question_id ? ` (${row.question_id})` : ''}`
      let valid = true
      const fail = (message) => {
        out.add(`${where}: ${message}`)
        valid = false
      }

      const id = row.question_id
      if (!id) fail('question_id is empty')
      else if (seenIds.has(id.toLowerCase())) fail(`duplicate question_id "${id}"`)
      else seenIds.add(id.toLowerCase())

      const type = row.question_type.toLowerCase()
      if (!QUESTION_TYPES.includes(type)) {
        fail(`question_type "${row.question_type}" must be one of: ${QUESTION_TYPES.join(', ')}`)
      }

      const rawSubtype = (row.question_subtype ?? '').toLowerCase()
      let subtype = null
      if (rawSubtype) {
        if (QUESTION_SUBTYPES.includes(rawSubtype)) subtype = rawSubtype
        else fail(`question_subtype "${row.question_subtype}" must be one of: ${QUESTION_SUBTYPES.join(', ')} (or blank)`)
      }
      let correctOption = null
      if (subtype === 'mcq') {
        if (type !== 'assessment') fail('an mcq question must be an assessment')
        if (!row.correct_option) fail('an mcq question needs a correct_option')
        else if (!OPTION_PATTERN.test(row.correct_option)) fail(`correct_option "${row.correct_option}" must be a short option label such as A or B`)
        else correctOption = row.correct_option.toUpperCase()
      } else if (row.correct_option) {
        fail('correct_option is only for mcq questions (set question_subtype to mcq)')
      }

      const difficulty = row.question_difficulty.toLowerCase()
      if (!DIFFICULTIES.includes(difficulty)) {
        fail(`question_difficulty "${row.question_difficulty}" must be one of: ${DIFFICULTIES.join(', ')}`)
      }

      const dimensions = []
      for (const part of parseList(row.question_dimension)) {
        const match = DIMENSIONS.find((d) => d.toLowerCase() === part.toLowerCase())
        if (!match) {
          fail(`question_dimension "${part}" must be one of: ${DIMENSIONS.join(', ')} (separate several with "${LIST_SEPARATOR}")`)
        } else if (dimensions.includes(match)) {
          fail(`question_dimension lists "${match}" more than once`)
        } else {
          dimensions.push(match)
        }
      }

      // Topics are optional; a blank cell means the question has none.
      const topics = row.question_topics ? parseList(row.question_topics) : []
      if (topics.some((t) => !t)) {
        fail(`question_topics must not contain an empty topic (separate several with "${LIST_SEPARATOR}")`)
      }

      const marks = NUMBER_PATTERN.test(row.marks) ? Number(row.marks) : NaN
      if (!(marks > 0)) fail(`marks "${row.marks}" must be a number greater than 0`)

      let expectedSolveRate = null
      if (row.expected_solve_rate) {
        const rate = NUMBER_PATTERN.test(row.expected_solve_rate) ? Number(row.expected_solve_rate) : NaN
        if (!(rate >= 0 && rate <= 100)) fail(`expected_solve_rate "${row.expected_solve_rate}" must be a percentage from 0 to 100`)
        else expectedSolveRate = rate
      }

      if (valid) {
        questions.push({ id, type, difficulty, dimensions, topics, marks, expectedSolveRate, subtype, correctOption })
      }
    })
    if (!(parsed.data ?? []).length) out.add(`${label}: the file has no question rows`)
  }

  return { questions, errors: out.finish(), warnings }
}

export function readScores(parsed, questions) {
  const label = 'Student scores'
  const out = collector()
  const warnings = []
  const students = []
  const fields = parsed?.meta?.fields ?? []

  if (normalizeName(fields[0]) !== 'student_id') {
    out.add(`${label}: the first column must be student_id`)
  } else {
    const idField = fields[0]
    const byId = new Map(questions.map((q) => [q.id, q]))
    const hasMcq = questions.some((q) => q.subtype === 'mcq')
    const questionFields = fields.slice(1)
    const seenFields = new Set()
    for (const field of questionFields) {
      if (seenFields.has(field)) out.add(`${label}: column "${field}" appears more than once`)
      seenFields.add(field)
      if (!byId.has(field)) out.add(`${label}: column "${field}" is not a question_id in the exam config`)
    }
    const absent = questions.filter((q) => !seenFields.has(q.id)).map((q) => q.id)
    if (absent.length) out.add(`${label}: no column for exam config question(s): ${absent.join(', ')}`)
    for (const e of parsed.errors ?? []) {
      if (e.type === 'FieldMismatch') out.add(`${label}: data row ${(e.row ?? 0) + 1}: ${e.message}`)
    }

    const seenStudents = new Set()
    ;(parsed.data ?? []).forEach((row, i) => {
      const id = String(row[idField] ?? '').trim()
      const where = `${label}: row ${i + 1}${id ? ` (${id})` : ''}`
      if (!id) {
        out.add(`${where}: student_id is empty`)
        return
      }
      if (seenStudents.has(id)) out.add(`${where}: duplicate student_id "${id}"`)
      seenStudents.add(id)

      const scores = {}
      const answers = {}
      for (const field of questionFields) {
        const q = byId.get(field)
        if (!q) continue
        const raw = String(row[field] ?? '').trim()
        if (raw === '') continue // blank means unattempted
        if (q.subtype === 'mcq') {
          // The cell is the chosen option; marks follow from the answer key.
          if (!OPTION_PATTERN.test(raw)) {
            out.add(`${where}, ${field}: "${raw}" is not an option label such as A or B (leave the cell blank if unattempted)`)
            continue
          }
          answers[field] = raw.toUpperCase()
          scores[field] = answers[field] === q.correctOption ? q.marks : 0
          continue
        }
        if (!NUMBER_PATTERN.test(raw)) {
          out.add(`${where}, ${field}: "${raw}" is not a number (leave the cell blank if unattempted)`)
          continue
        }
        const value = Number(raw)
        if (value < 0) out.add(`${where}, ${field}: negative score ${value}`)
        else if (value > q.marks + EPSILON) out.add(`${where}, ${field}: score ${value} exceeds the maximum of ${q.marks}`)
        else scores[field] = value
      }
      students.push({ id, scores, ...(hasMcq ? { answers } : {}) })
    })
    if (!(parsed.data ?? []).length) out.add(`${label}: the file has no student rows`)
  }

  return { students, errors: out.finish(), warnings }
}

// The cohort file: one row per student. Returns { students, names, sections, errors, warnings }.
export function readStudentNames(parsed) {
  const label = 'Student details'
  const out = collector()
  const warnings = []
  const names = {}
  const sections = {}
  const students = []
  const { missing, extra } = checkStructure(label, parsed, ['student_id', 'student_name'], ['section'], out)
  if (extra.length) warnings.push(`${label}: ignoring unknown column(s): ${extra.join(', ')}`)

  if (!missing.length) {
    ;(parsed.data ?? []).forEach((rawRow, i) => {
      const row = normalizeRow(rawRow)
      const where = `${label}: row ${i + 1}${row.student_id ? ` (${row.student_id})` : ''}`
      if (!row.student_id) out.add(`${where}: student_id is empty`)
      else if (row.student_id in names) out.add(`${where}: duplicate student_id "${row.student_id}"`)
      else if (!row.student_name) out.add(`${where}: student_name is empty`)
      else {
        names[row.student_id] = row.student_name
        sections[row.student_id] = row.section || null
        students.push({ id: row.student_id, name: row.student_name, section: row.section || null })
      }
    })
  }

  return { students, names, sections, errors: out.finish(), warnings }
}

// The attendance file of one exam: student_id and attendance (present or absent;
// blank means present). Returns { absent: { id: boolean }, errors, warnings }.
export function readAttendance(parsed) {
  const label = 'Attendance'
  const out = collector()
  const warnings = []
  const absent = {}
  const { missing, extra } = checkStructure(label, parsed, ['student_id', 'attendance'], [], out)
  if (extra.length) warnings.push(`${label}: ignoring unknown column(s): ${extra.join(', ')}`)

  if (!missing.length) {
    ;(parsed.data ?? []).forEach((rawRow, i) => {
      const row = normalizeRow(rawRow)
      const where = `${label}: row ${i + 1}${row.student_id ? ` (${row.student_id})` : ''}`
      const value = row.attendance.toLowerCase()
      if (!row.student_id) out.add(`${where}: student_id is empty`)
      else if (row.student_id in absent) out.add(`${where}: duplicate student_id "${row.student_id}"`)
      else if (value && !ATTENDANCE_VALUES.includes(value)) out.add(`${where}: attendance "${row.attendance}" must be present or absent (or blank for present)`)
      else absent[row.student_id] = value === 'absent'
    })
  }
  return { absent, errors: out.finish(), warnings }
}

const list = (ids) => (ids.length > 10 ? `${ids.slice(0, 10).join(', ')}, and ${ids.length - 10} more` : ids.join(', '))

// config and scores are the exam's files. cohort is the list of students the exam
// is for ([{ id, name, section }]); attendance is the optional parsed attendance
// file. Every cohort student is in the exam: one without a row in the scores file
// is absent, and an attendance file can mark others absent (their scores are ignored).
export function readDataset({ config, scores, cohort, attendance = null }) {
  const configResult = readExamConfig(config)
  const errors = [...configResult.errors]
  const warnings = [...configResult.warnings]

  // Scores can only be checked against a valid config.
  const scoresResult = configResult.errors.length
    ? { students: [], errors: [], warnings: [] }
    : readScores(scores, configResult.questions)
  errors.push(...scoresResult.errors)
  warnings.push(...scoresResult.warnings)

  if (!Array.isArray(cohort)) errors.push('A cohort is required: choose the cohort this exam is for')

  let attendanceResult = { absent: {}, errors: [], warnings: [] }
  if (attendance) {
    attendanceResult = readAttendance(attendance)
    errors.push(...attendanceResult.errors)
    warnings.push(...attendanceResult.warnings)
  }

  if (Array.isArray(cohort) && !errors.length) {
    const inCohort = new Set(cohort.map((s) => s.id))
    const notInCohort = scoresResult.students.filter((s) => !inCohort.has(s.id)).map((s) => s.id)
    if (notInCohort.length) errors.push(`Scores: ${notInCohort.length} student(s) are not in the cohort: ${list(notInCohort)}`)
    const unknown = Object.keys(attendanceResult.absent).filter((id) => !inCohort.has(id))
    if (unknown.length) errors.push(`Attendance: ${unknown.length} student(s) are not in the cohort: ${list(unknown)}`)
  }

  if (errors.length) return { dataset: null, errors, warnings }

  const rows = new Map(scoresResult.students.map((s) => [s.id, s]))
  const explicit = attendanceResult.absent

  const noRow = cohort.filter((s) => !rows.has(s.id) && !(s.id in explicit))
  if (noRow.length) {
    warnings.push(`Scores: ${noRow.length} cohort student(s) have no row and are counted as absent: ${list(noRow.map((s) => s.id))}`)
  }
  const withScores = cohort.filter((s) => explicit[s.id] && rows.has(s.id) && Object.keys(rows.get(s.id).scores).length)
  if (withScores.length) {
    warnings.push(`Attendance: ${withScores.length} student(s) marked absent have scores, which are ignored (counted as zero): ${list(withScores.map((s) => s.id))}`)
  }

  return {
    dataset: {
      questions: configResult.questions,
      students: cohort.map((student) => {
        const row = rows.get(student.id)
        const absent = student.id in explicit ? explicit[student.id] : !row
        return {
          id: student.id,
          name: student.name,
          section: student.section ?? null,
          absent,
          scores: absent || !row ? {} : row.scores,
          ...(row?.answers && !absent ? { answers: row.answers } : {}),
        }
      }),
    },
    errors: [],
    warnings,
  }
}
