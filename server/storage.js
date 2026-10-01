import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { buildProfiles } from '../src/profile.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
export const ROOT_DIR = path.resolve(__dirname, '..')
export const DEFAULT_DATA_DIR = path.join(ROOT_DIR, 'data')
export const DEFAULT_SAMPLES_DIR = path.join(ROOT_DIR, 'samples')

export function getPaths(dataDir = DEFAULT_DATA_DIR, samplesDir = DEFAULT_SAMPLES_DIR) {
  return {
    dataDir,
    examsDir: path.join(dataDir, 'exams'),
    studentsDir: path.join(dataDir, 'students'),
    indexFile: path.join(dataDir, 'index.json'),
    samplesDir,
  }
}

export function ensureDirs(dataDir = DEFAULT_DATA_DIR) {
  const { examsDir, studentsDir, indexFile } = getPaths(dataDir)
  fs.mkdirSync(examsDir, { recursive: true })
  fs.mkdirSync(studentsDir, { recursive: true })
  if (!fs.existsSync(indexFile)) {
    fs.writeFileSync(indexFile, '[]', 'utf8')
  }
}

export function getIndex(dataDir = DEFAULT_DATA_DIR) {
  ensureDirs(dataDir)
  const { indexFile } = getPaths(dataDir)
  try {
    const raw = fs.readFileSync(indexFile, 'utf8')
    return JSON.parse(raw)
  } catch (err) {
    return []
  }
}

export function saveIndex(indexData, dataDir = DEFAULT_DATA_DIR) {
  ensureDirs(dataDir)
  const { indexFile } = getPaths(dataDir)
  fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2), 'utf8')
}

export function getExam(id, dataDir = DEFAULT_DATA_DIR) {
  ensureDirs(dataDir)
  const { examsDir } = getPaths(dataDir)
  const filePath = path.join(examsDir, `${id}.json`)
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

export function generateExamId(courseName, examTitle) {
  const c = String(courseName || 'course')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'course'
  const t = String(examTitle || 'exam')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'exam'
  const ts = Date.now()
  return `${c}-${t}-${ts}`
}

export function updateLongitudinalHistory(examId, courseName, examTitle, examDate, analysis, dataDir = DEFAULT_DATA_DIR) {
  ensureDirs(dataDir)
  const { studentsDir } = getPaths(dataDir)
  const students = analysis?.students || []

  for (const student of students) {
    const studentId = student.id
    if (!studentId) continue
    const studentFile = path.join(studentsDir, `${studentId}.json`)
    let studentData = { id: studentId, name: student.name || studentId, exams: [] }

    if (fs.existsSync(studentFile)) {
      try {
        studentData = JSON.parse(fs.readFileSync(studentFile, 'utf8'))
      } catch (e) {
        studentData = { id: studentId, name: student.name || studentId, exams: [] }
      }
    }

    studentData.name = student.name || studentData.name || studentId
    studentData.exams = Array.isArray(studentData.exams) ? studentData.exams : []

    const examEntry = {
      examId,
      courseName,
      examTitle,
      examDate,
      earned: student.earned,
      totalExam: student.totalExam,
      totalAttempted: student.totalAttempted,
      masteryPct: student.masteryPct,
      accuracyPct: student.accuracyPct,
      dimensions: student.dimensions,
    }

    const existingIdx = studentData.exams.findIndex((e) => e.examId === examId)
    if (existingIdx >= 0) {
      studentData.exams[existingIdx] = examEntry
    } else {
      studentData.exams.push(examEntry)
    }

    fs.writeFileSync(studentFile, JSON.stringify(studentData, null, 2), 'utf8')
  }
}

export function removeExamFromStudentHistory(examId, dataDir = DEFAULT_DATA_DIR) {
  ensureDirs(dataDir)
  const { studentsDir } = getPaths(dataDir)
  if (!fs.existsSync(studentsDir)) return

  const files = fs.readdirSync(studentsDir).filter((f) => f.endsWith('.json'))
  for (const file of files) {
    const studentFile = path.join(studentsDir, file)
    try {
      const studentData = JSON.parse(fs.readFileSync(studentFile, 'utf8'))
      if (Array.isArray(studentData.exams)) {
        const initialCount = studentData.exams.length
        studentData.exams = studentData.exams.filter((e) => e.examId !== examId)
        if (studentData.exams.length !== initialCount) {
          fs.writeFileSync(studentFile, JSON.stringify(studentData, null, 2), 'utf8')
        }
      }
    } catch (e) {
      // ignore read/parse error
    }
  }
}

export function saveExam({ id, courseName, examTitle, examDate, questions, scores, studentInfo, analysis }, dataDir = DEFAULT_DATA_DIR) {
  ensureDirs(dataDir)
  const { examsDir } = getPaths(dataDir)

  const examId = id || generateExamId(courseName, examTitle)
  const cName = courseName || 'Untitled Course'
  const eTitle = examTitle || 'Untitled Exam'
  const eDate = examDate || new Date().toISOString().split('T')[0]

  const finalAnalysis = analysis || buildProfiles(questions || [], scores || {}, studentInfo || {})
  const studentCount = finalAnalysis?.students?.length || Object.keys(scores || {}).length || 0
  const questionCount = questions?.length || 0
  const createdAt = new Date().toISOString()

  const fullExam = {
    id: examId,
    courseName: cName,
    examTitle: eTitle,
    examDate: eDate,
    studentCount,
    questionCount,
    createdAt,
    questions: questions || [],
    scores: scores || {},
    studentInfo: studentInfo || {},
    analysis: finalAnalysis,
  }

  const examFile = path.join(examsDir, `${examId}.json`)
  fs.writeFileSync(examFile, JSON.stringify(fullExam, null, 2), 'utf8')

  // Update index.json
  const index = getIndex(dataDir)
  const summaryEntry = {
    id: examId,
    courseName: cName,
    examTitle: eTitle,
    examDate: eDate,
    studentCount,
    questionCount,
    createdAt,
  }

  const existingIndex = index.findIndex((item) => item.id === examId)
  if (existingIndex >= 0) {
    index[existingIndex] = summaryEntry
  } else {
    index.unshift(summaryEntry)
  }
  saveIndex(index, dataDir)

  // Update cumulative student history
  updateLongitudinalHistory(examId, cName, eTitle, eDate, finalAnalysis, dataDir)

  return { success: true, id: examId }
}

export function deleteExam(examId, dataDir = DEFAULT_DATA_DIR) {
  ensureDirs(dataDir)
  const { examsDir } = getPaths(dataDir)
  const examFile = path.join(examsDir, `${examId}.json`)

  if (fs.existsSync(examFile)) {
    fs.unlinkSync(examFile)
  }

  const index = getIndex(dataDir).filter((e) => e.id !== examId)
  saveIndex(index, dataDir)

  removeExamFromStudentHistory(examId, dataDir)

  return { success: true }
}

export function listStudents(dataDir = DEFAULT_DATA_DIR) {
  ensureDirs(dataDir)
  const { studentsDir } = getPaths(dataDir)
  if (!fs.existsSync(studentsDir)) return []

  const files = fs.readdirSync(studentsDir).filter((f) => f.endsWith('.json'))
  const students = []

  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(studentsDir, file), 'utf8'))
      students.push({
        id: data.id,
        name: data.name,
        examCount: Array.isArray(data.exams) ? data.exams.length : 0,
      })
    } catch (e) {
      // skip invalid file
    }
  }

  return students.sort((a, b) => a.name.localeCompare(b.name))
}

export function getStudentHistory(studentId, dataDir = DEFAULT_DATA_DIR) {
  ensureDirs(dataDir)
  const { studentsDir } = getPaths(dataDir)
  const studentFile = path.join(studentsDir, `${studentId}.json`)
  if (!fs.existsSync(studentFile)) return null

  try {
    return JSON.parse(fs.readFileSync(studentFile, 'utf8'))
  } catch (e) {
    return null
  }
}

export function getSamples(samplesDir = DEFAULT_SAMPLES_DIR) {
  const examConfigFile = path.join(samplesDir, 'exam_config_sample.csv')
  const studentScoresFile = path.join(samplesDir, 'student_scores_sample.csv')
  const studentsFile = path.join(samplesDir, 'students_sample.csv')

  const contestExamConfigFile = path.join(samplesDir, 'contest_exam_config.csv')
  const contestStudentScoresFile = path.join(samplesDir, 'contest_student_scores.csv')
  const contestStudentsFile = path.join(samplesDir, 'contest_students.csv')

  const examConfig = fs.existsSync(examConfigFile) ? fs.readFileSync(examConfigFile, 'utf8') : ''
  const studentScores = fs.existsSync(studentScoresFile) ? fs.readFileSync(studentScoresFile, 'utf8') : ''
  const students = fs.existsSync(studentsFile) ? fs.readFileSync(studentsFile, 'utf8') : ''

  const contestExamConfig = fs.existsSync(contestExamConfigFile) ? fs.readFileSync(contestExamConfigFile, 'utf8') : ''
  const contestStudentScores = fs.existsSync(contestStudentScoresFile) ? fs.readFileSync(contestStudentScoresFile, 'utf8') : ''
  const contestStudents = fs.existsSync(contestStudentsFile) ? fs.readFileSync(contestStudentsFile, 'utf8') : ''

  return {
    examConfig,
    studentScores,
    students,
    contestExamConfig,
    contestStudentScores,
    contestStudents,
    // Aliases
    exam_config: examConfig,
    student_scores: studentScores,
    exam_config_sample: examConfig,
    student_scores_sample: studentScores,
    students_sample: students,
    contest_exam_config: contestExamConfig,
    contest_student_scores: contestStudentScores,
    contest_students: contestStudents,
  }
}
