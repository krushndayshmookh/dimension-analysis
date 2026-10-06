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
  const { examsDir, studentsDir, indexFile } = paths(dataDir)
  fs.mkdirSync(examsDir, { recursive: true })
  fs.mkdirSync(studentsDir, { recursive: true })
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

  const courseName = payload.courseName || 'Untitled course'
  const examTitle = payload.examTitle || 'Untitled exam'
  const exam = {
    id: payload.id || `${slug(courseName, 'course')}-${slug(examTitle, 'exam')}-${Date.now()}`,
    courseName,
    examTitle,
    examDate: payload.examDate || new Date().toISOString().slice(0, 10),
    studentCount: dataset.students.length,
    questionCount: dataset.questions.length,
    avgMasteryPct: analysis.cohort?.masteryPct ?? null,
    questionSummaries: payload.questionSummaries ?? [],
    createdAt: new Date().toISOString(),
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
