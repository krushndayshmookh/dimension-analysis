import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const DEFAULT_DATA_DIR = path.resolve(__dirname, '..', 'data')

// The client is the application: it sends the dataset and its analysis and
// storage keeps them as given. Only the shape needed to index them is checked.
export class ValidationError extends Error {}

const paths = (dataDir) => ({
  settingsFile: path.join(dataDir, 'settings.json'),
  examsDir: path.join(dataDir, 'exams'),
  studentsDir: path.join(dataDir, 'students'),
  cohortsDir: path.join(dataDir, 'cohorts'),
  indexFile: path.join(dataDir, 'index.json'),
})

// Ids become file names; encoding keeps any id usable.
const fileFor = (dir, id) => path.join(dir, `${encodeURIComponent(id)}.json`)

function writeJson(file, value) {
  const temp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), 'utf8')
  fs.renameSync(temp, file)
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

export function ensureDirs(dataDir = DEFAULT_DATA_DIR) {
  const { examsDir, studentsDir, cohortsDir, indexFile } = paths(dataDir)
  fs.mkdirSync(examsDir, { recursive: true })
  fs.mkdirSync(studentsDir, { recursive: true })
  fs.mkdirSync(cohortsDir, { recursive: true })
  if (!fs.existsSync(indexFile)) writeJson(indexFile, [])
}

export function getIndex(dataDir = DEFAULT_DATA_DIR) {
  ensureDirs(dataDir)
  try {
    return readJson(paths(dataDir).indexFile)
  } catch (err) {
    // Never fall back to an empty index: the next save would overwrite the real one.
    throw new Error(`Exam index is unreadable (${err.message}). Fix or remove data/index.json.`)
  }
}

const saveIndex = (index, dataDir) => writeJson(paths(dataDir).indexFile, index)

export function getExam(id, dataDir = DEFAULT_DATA_DIR) {
  ensureDirs(dataDir)
  const file = fileFor(paths(dataDir).examsDir, id)
  return fs.existsSync(file) ? readJson(file) : null
}

const slug = (text, fallback) =>
  String(text || fallback).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || fallback

function updateStudentHistories(exam, dataDir) {
  const { studentsDir } = paths(dataDir)
  for (const student of exam.analysis.students) {
    const file = fileFor(studentsDir, student.id)
    const history = fs.existsSync(file) ? readJson(file) : { id: student.id, name: student.name, exams: [] }
    history.name = student.name || history.name
    const entry = {
      examId: exam.id,
      courseName: exam.courseName,
      examTitle: exam.examTitle,
      examDate: exam.examDate,
      earned: student.earned,
      totalMarks: student.totalMarks,
      attemptedMarks: student.attemptedMarks,
      masteryPct: student.masteryPct,
      accuracyPct: student.accuracyPct,
      dimensions: student.dimensions,
    }
    const at = history.exams.findIndex((e) => e.examId === exam.id)
    if (at >= 0) history.exams[at] = entry
    else history.exams.push(entry)
    writeJson(file, history)
  }
}

// payload: { id?, courseName, examTitle, examDate, dataset, analysis }
export function saveExam(payload, dataDir = DEFAULT_DATA_DIR) {
  const { dataset, analysis } = payload ?? {}
  if (!dataset || !Array.isArray(dataset.questions) || !Array.isArray(dataset.students)) {
    throw new ValidationError('dataset with questions and students is required')
  }
  if (!analysis || !Array.isArray(analysis.students)) {
    throw new ValidationError('analysis with students is required')
  }
  if (payload.questionSummaries !== undefined && !Array.isArray(payload.questionSummaries)) {
    throw new ValidationError('questionSummaries must be a list')
  }
  ensureDirs(dataDir)
  if (!payload.cohortId || !getCohort(payload.cohortId, dataDir)) {
    throw new ValidationError('An exam needs an existing cohort (cohortId)')
  }

  const courseName = payload.courseName || 'Untitled course'
  const examTitle = payload.examTitle || 'Untitled exam'
  const exam = {
    id: payload.id || `${slug(courseName, 'course')}-${slug(examTitle, 'exam')}-${Date.now()}`,
    cohortId: payload.cohortId,
    courseName,
    examTitle,
    examDate: payload.examDate || new Date().toISOString().slice(0, 10),
    studentCount: dataset.students.length,
    questionCount: dataset.questions.length,
    avgMasteryPct: analysis.cohort?.masteryPct ?? null,
    questionSummaries: payload.questionSummaries ?? [],
    createdAt: payload.createdAt ?? new Date().toISOString(),
    dataset,
    analysis,
  }

  writeJson(fileFor(paths(dataDir).examsDir, exam.id), exam)

  const { dataset: _d, analysis: _a, ...summary } = exam
  const index = getIndex(dataDir)
  const at = index.findIndex((e) => e.id === exam.id)
  if (at >= 0) index[at] = summary
  else index.unshift(summary)
  saveIndex(index, dataDir)

  updateStudentHistories(exam, dataDir)
  return { success: true, id: exam.id }
}

export function deleteExam(id, dataDir = DEFAULT_DATA_DIR) {
  ensureDirs(dataDir)
  const { examsDir, studentsDir } = paths(dataDir)
  const file = fileFor(examsDir, id)
  if (fs.existsSync(file)) fs.unlinkSync(file)
  saveIndex(getIndex(dataDir).filter((e) => e.id !== id), dataDir)

  for (const name of fs.readdirSync(studentsDir).filter((f) => f.endsWith('.json'))) {
    const studentFile = path.join(studentsDir, name)
    const history = readJson(studentFile)
    const exams = history.exams.filter((e) => e.examId !== id)
    if (exams.length !== history.exams.length) writeJson(studentFile, { ...history, exams })
  }
  return { success: true }
}

export function listStudents(dataDir = DEFAULT_DATA_DIR) {
  ensureDirs(dataDir)
  const { studentsDir } = paths(dataDir)
  return fs
    .readdirSync(studentsDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => readJson(path.join(studentsDir, f)))
    .map((h) => ({ id: h.id, name: h.name, examCount: h.exams.length }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function getStudentHistory(id, dataDir = DEFAULT_DATA_DIR) {
  ensureDirs(dataDir)
  const file = fileFor(paths(dataDir).studentsDir, id)
  if (!fs.existsSync(file)) return null
  const history = readJson(file)
  // Array.prototype.sort is stable, so equal dates keep their save order.
  return { ...history, exams: [...history.exams].sort((a, b) => String(a.examDate).localeCompare(String(b.examDate))) }
}

// Settings are stored as given; the client validates them and merges them with its defaults.
export function getSettings(dataDir = DEFAULT_DATA_DIR) {
  const { settingsFile } = paths(dataDir)
  return fs.existsSync(settingsFile) ? readJson(settingsFile) : {}
}

export function saveSettings(settings, dataDir = DEFAULT_DATA_DIR) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new ValidationError('settings must be an object')
  }
  ensureDirs(dataDir)
  writeJson(paths(dataDir).settingsFile, settings)
  return { success: true }
}

// Everything needed to rebuild the data folder: settings, the cohorts and every
// full exam (the index and student histories are derived from the exams).
export function exportBackup(dataDir = DEFAULT_DATA_DIR) {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    settings: getSettings(dataDir),
    cohorts: readCohorts(dataDir),
    exams: getIndex(dataDir).map((entry) => getExam(entry.id, dataDir)).filter(Boolean),
  }
}

// Merges a backup into the data folder: cohorts and exams with the same id are
// replaced, others are kept, and settings are replaced.
export function restoreBackup(backup, dataDir = DEFAULT_DATA_DIR) {
  if (!backup || typeof backup !== 'object' || backup.version !== 2 || !Array.isArray(backup.exams) || !Array.isArray(backup.cohorts)) {
    throw new ValidationError('This is not a backup file made by this app (version 2)')
  }
  ensureDirs(dataDir)
  for (const cohort of backup.cohorts) {
    if (!cohort?.id || !Array.isArray(cohort.students)) throw new ValidationError('The backup contains an invalid cohort')
    writeJson(fileFor(paths(dataDir).cohortsDir, cohort.id), cohort)
  }
  for (const exam of backup.exams) {
    try {
      saveExam(exam, dataDir)
    } catch (err) {
      throw new ValidationError(`The backup contains an invalid exam (${exam?.id ?? 'no id'}): ${err.message}`)
    }
  }
  if (backup.settings && typeof backup.settings === 'object' && !Array.isArray(backup.settings)) saveSettings(backup.settings, dataDir)
  return { success: true, cohorts: backup.cohorts.length, exams: backup.exams.length }
}

// ---- cohorts --------------------------------------------------------------------
// A cohort is a named group of students, uploaded once and used by many exams.
// A student id belongs to one cohort only.

function readCohorts(dataDir) {
  ensureDirs(dataDir)
  const { cohortsDir } = paths(dataDir)
  return fs
    .readdirSync(cohortsDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => readJson(path.join(cohortsDir, name)))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)) || a.name.localeCompare(b.name))
}

export function getCohort(id, dataDir = DEFAULT_DATA_DIR) {
  ensureDirs(dataDir)
  const file = fileFor(paths(dataDir).cohortsDir, id)
  return fs.existsSync(file) ? readJson(file) : null
}

export function listCohorts(dataDir = DEFAULT_DATA_DIR) {
  const index = getIndex(dataDir)
  return readCohorts(dataDir).map(({ id, name, students, createdAt, updatedAt }) => ({
    id,
    name,
    studentCount: students.length,
    examCount: index.filter((e) => e.cohortId === id).length,
    createdAt,
    updatedAt,
  }))
}

function cleanName(name, cohorts, exceptId) {
  const text = String(name ?? '').trim()
  if (!text) throw new ValidationError('A cohort needs a name')
  if (cohorts.some((c) => c.id !== exceptId && c.name.toLowerCase() === text.toLowerCase())) {
    throw new ValidationError(`A cohort named "${text}" already exists`)
  }
  return text
}

function cleanStudents(list) {
  if (!Array.isArray(list)) throw new ValidationError('students must be a list')
  const seen = new Set()
  return list.map((raw, i) => {
    const id = String(raw?.id ?? '').trim()
    const name = String(raw?.name ?? '').trim()
    if (!id) throw new ValidationError(`Student ${i + 1}: the student id is empty`)
    if (!name) throw new ValidationError(`Student ${id}: the name is empty`)
    if (seen.has(id)) throw new ValidationError(`Student ${id} appears more than once`)
    seen.add(id)
    return { id, name, section: String(raw?.section ?? '').trim() || null }
  })
}

// Rejects ids that already belong to another cohort.
function checkOwnership(students, cohorts, cohortId) {
  const owner = new Map()
  for (const c of cohorts) if (c.id !== cohortId) for (const s of c.students) owner.set(s.id, c.name)
  const clashes = students.filter((s) => owner.has(s.id))
  if (clashes.length) {
    const shown = clashes.slice(0, 5).map((s) => `${s.id} (in ${owner.get(s.id)})`).join(', ')
    throw new ValidationError(`${clashes.length} student(s) already belong to another cohort: ${shown}${clashes.length > 5 ? ', …' : ''}`)
  }
}

// Adds new students and updates changed ones by student id; nobody is removed.
function merge(existing, incoming) {
  const students = existing.map((s) => ({ ...s }))
  const summary = { added: 0, updated: 0, unchanged: 0 }
  for (const s of incoming) {
    const at = students.findIndex((x) => x.id === s.id)
    if (at < 0) {
      students.push(s)
      summary.added++
    } else if (students[at].name !== s.name || students[at].section !== s.section) {
      students[at] = s
      summary.updated++
    } else {
      summary.unchanged++
    }
  }
  return { students, summary }
}

// payload: { name, students: [{ id, name, section }] }
export function createCohort(payload, dataDir = DEFAULT_DATA_DIR) {
  const cohorts = readCohorts(dataDir)
  const name = cleanName(payload?.name, cohorts)
  const incoming = cleanStudents(payload?.students ?? [])
  checkOwnership(incoming, cohorts, null)
  const now = new Date().toISOString()
  const { students, summary } = merge([], incoming)
  const cohort = { id: `${slug(name, 'cohort')}-${Date.now()}`, name, students, createdAt: now, updatedAt: now }
  writeJson(fileFor(paths(dataDir).cohortsDir, cohort.id), cohort)
  return { success: true, id: cohort.id, summary }
}

// payload: { name?, students? }. Students are merged into the cohort by id.
export function updateCohort(id, payload, dataDir = DEFAULT_DATA_DIR) {
  const cohorts = readCohorts(dataDir)
  const cohort = cohorts.find((c) => c.id === id)
  if (!cohort) throw new ValidationError('Cohort not found')
  const name = payload?.name === undefined ? cohort.name : cleanName(payload.name, cohorts, id)
  const incoming = payload?.students === undefined ? [] : cleanStudents(payload.students)
  checkOwnership(incoming, cohorts, id)
  const { students, summary } = merge(cohort.students, incoming)
  writeJson(fileFor(paths(dataDir).cohortsDir, id), { ...cohort, name, students, updatedAt: new Date().toISOString() })
  return { success: true, id, summary }
}

// A cohort that exams use cannot be deleted.
export function deleteCohort(id, dataDir = DEFAULT_DATA_DIR) {
  const cohort = getCohort(id, dataDir)
  if (!cohort) throw new ValidationError('Cohort not found')
  const using = getIndex(dataDir).filter((e) => e.cohortId === id)
  if (using.length) {
    throw new ValidationError(`Cohort "${cohort.name}" is used by ${using.length} exam(s): ${using.slice(0, 5).map((e) => e.examTitle).join(', ')}. Delete them first.`)
  }
  fs.rmSync(fileFor(paths(dataDir).cohortsDir, id))
  return { success: true }
}
