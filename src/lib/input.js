import { DIMENSIONS, DIFFICULTIES, LIST_SEPARATOR } from './constants.js'

// Strict readers for the three input files. Anything that does not follow the
// documented format is reported in `errors`; callers must reject the upload
// when `errors` is not empty. `warnings` never block an upload.
//
// Each reader takes a parsed CSV ({ data, errors, meta: { fields } }).

const MAX_ERRORS = 100
const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/
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

const CONFIG_REQUIRED = ['question_id', 'question_type', 'question_difficulty', 'question_dimension', 'question_topics', 'marks']
const CONFIG_OPTIONAL = ['expected_solve_rate']

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

      if (!row.question_type) fail('question_type is empty')

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

      const topics = parseList(row.question_topics)
      if (!row.question_topics || topics.some((t) => !t)) {
        fail(`question_topics must list at least one non-empty topic (separate several with "${LIST_SEPARATOR}")`)
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
        questions.push({ id, type: row.question_type, difficulty, dimensions, topics, marks, expectedSolveRate })
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
      for (const field of questionFields) {
        const q = byId.get(field)
        if (!q) continue
        const raw = String(row[field] ?? '').trim()
        if (raw === '') continue // blank means unattempted
        if (!NUMBER_PATTERN.test(raw)) {
          out.add(`${where}, ${field}: "${raw}" is not a number (leave the cell blank if unattempted)`)
          continue
        }
        const value = Number(raw)
        if (value < 0) out.add(`${where}, ${field}: negative score ${value}`)
        else if (value > q.marks + EPSILON) out.add(`${where}, ${field}: score ${value} exceeds the maximum of ${q.marks}`)
        else scores[field] = value
      }
      students.push({ id, scores })
    })
    if (!(parsed.data ?? []).length) out.add(`${label}: the file has no student rows`)
  }

  return { students, errors: out.finish(), warnings }
}

export function readStudentNames(parsed) {
  const label = 'Student details'
  const out = collector()
  const warnings = []
  const names = {}
  const { missing, extra } = checkStructure(label, parsed, ['student_id', 'student_name'], [], out)
  if (extra.length) warnings.push(`${label}: ignoring unknown column(s): ${extra.join(', ')}`)

  if (!missing.length) {
    ;(parsed.data ?? []).forEach((rawRow, i) => {
      const row = normalizeRow(rawRow)
      const where = `${label}: row ${i + 1}${row.student_id ? ` (${row.student_id})` : ''}`
      if (!row.student_id) out.add(`${where}: student_id is empty`)
      else if (row.student_id in names) out.add(`${where}: duplicate student_id "${row.student_id}"`)
      else if (!row.student_name) out.add(`${where}: student_name is empty`)
      else names[row.student_id] = row.student_name
    })
  }

  return { names, errors: out.finish(), warnings }
}

// config and scores are required; students (names) is optional.
export function readDataset({ config, scores, students }) {
  const configResult = readExamConfig(config)
  const errors = [...configResult.errors]
  const warnings = [...configResult.warnings]

  // Scores can only be checked against a valid config.
  const scoresResult = configResult.errors.length
    ? { students: [], errors: [], warnings: [] }
    : readScores(scores, configResult.questions)
  errors.push(...scoresResult.errors)
  warnings.push(...scoresResult.warnings)

  let names = null
  if (students) {
    const namesResult = readStudentNames(students)
    errors.push(...namesResult.errors)
    warnings.push(...namesResult.warnings)
    names = namesResult.names
  }

  if (names && !errors.length) {
    const scored = new Set(scoresResult.students.map((s) => s.id))
    const unnamed = scoresResult.students.filter((s) => !(s.id in names)).map((s) => s.id)
    if (unnamed.length) errors.push(`Student details: no row for scored student(s): ${unnamed.join(', ')}`)
    const unscored = Object.keys(names).filter((id) => !scored.has(id))
    if (unscored.length) warnings.push(`Student details: ignoring ${unscored.length} student(s) with no scores: ${unscored.join(', ')}`)
  }

  if (errors.length) return { dataset: null, errors, warnings }

  return {
    dataset: {
      questions: configResult.questions,
      students: scoresResult.students.map((s) => ({ id: s.id, name: names?.[s.id] ?? s.id, scores: s.scores })),
    },
    errors: [],
    warnings,
  }
}
