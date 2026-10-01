import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  ensureDirs,
  getIndex,
  getExam,
  saveExam,
  deleteExam,
  listStudents,
  getStudentHistory,
  getSamples,
  DEFAULT_DATA_DIR,
  DEFAULT_SAMPLES_DIR,
} from './storage.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
if (!app._router) {
  Object.defineProperty(app, '_router', {
    get() {
      return this.router
    },
    configurable: true,
  })
}
const PORT = process.env.PORT || 3001

// Middleware
app.use(express.json({ limit: '50mb' }))

// CORS headers for Vite frontend communication
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }
  next()
})

// Initialize storage directories
ensureDirs(DEFAULT_DATA_DIR)

// 1. GET /api/exams - list exam summaries
app.get('/api/exams', (req, res) => {
  try {
    const index = getIndex(DEFAULT_DATA_DIR)
    res.json(index)
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve exams index', message: err.message })
  }
})

// 2. GET /api/exams/:id - get full exam analysis
app.get('/api/exams/:id', (req, res) => {
  try {
    const exam = getExam(req.params.id, DEFAULT_DATA_DIR)
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' })
    }
    res.json(exam)
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve exam', message: err.message })
  }
})

// 3. POST /api/exams - save exam, update index and student histories
app.post('/api/exams', (req, res) => {
  try {
    const { courseName, examTitle, examDate, questions, scores, studentInfo, analysis, id } = req.body

    const result = saveExam({
      id,
      courseName,
      examTitle,
      examDate,
      questions,
      scores,
      studentInfo,
      analysis,
    }, DEFAULT_DATA_DIR)

    res.status(201).json(result)
  } catch (err) {
    res.status(500).json({ error: 'Failed to save exam', message: err.message })
  }
})

// 4. DELETE /api/exams/:id - remove exam and clean student histories
app.delete('/api/exams/:id', (req, res) => {
  try {
    const examId = req.params.id
    const existing = getExam(examId, DEFAULT_DATA_DIR)
    if (!existing) {
      return res.status(404).json({ error: 'Exam not found' })
    }

    const result = deleteExam(examId, DEFAULT_DATA_DIR)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete exam', message: err.message })
  }
})

// 5. GET /api/students - list all students
app.get('/api/students', (req, res) => {
  try {
    const students = listStudents(DEFAULT_DATA_DIR)
    res.json(students)
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve students', message: err.message })
  }
})

// 6. GET /api/students/:id/history - get cumulative student history
app.get('/api/students/:id/history', (req, res) => {
  try {
    const history = getStudentHistory(req.params.id, DEFAULT_DATA_DIR)
    if (!history) {
      return res.status(404).json({ error: 'Student not found' })
    }
    res.json(history)
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve student history', message: err.message })
  }
})

// 7. GET /api/samples - get sample CSV contents
app.get('/api/samples', (req, res) => {
  try {
    const samples = getSamples(DEFAULT_SAMPLES_DIR)
    res.json(samples)
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve sample files', message: err.message })
  }
})

import fs from 'fs'

// Serve static frontend build if present
const distPath = path.resolve(__dirname, '../dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// Start server if run directly
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename
if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`Dimension Analysis server running on port ${PORT}`)
  })
}

export default app
export { app }
