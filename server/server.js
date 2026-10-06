import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  DEFAULT_DATA_DIR,
  ValidationError,
  ensureDirs,
  getIndex,
  getExam,
  saveExam,
  deleteExam,
  listStudents,
  getStudentHistory,
  getSettings,
  saveSettings,
  exportBackup,
  restoreBackup,
  createCohort,
  deleteCohort,
  getCohort,
  listCohorts,
  updateCohort,
} from './storage.js'

const __filename = fileURLToPath(import.meta.url)
const distPath = path.resolve(path.dirname(__filename), '..', 'dist')

// Local persistence for the single-instructor app. The browser app does the
// analysis; this only stores what it sends.
export function createApp({ dataDir = DEFAULT_DATA_DIR } = {}) {
  ensureDirs(dataDir)
  const app = express()
  app.use(express.json({ limit: '100mb' }))

  const handle = (fn) => (req, res) => {
    try {
      fn(req, res)
    } catch (err) {
      res.status(err instanceof ValidationError ? 400 : 500).json({ error: err.message })
    }
  }

  app.get('/api/exams', handle((req, res) => res.json(getIndex(dataDir))))

  app.get('/api/exams/:id', handle((req, res) => {
    const exam = getExam(req.params.id, dataDir)
    if (!exam) return res.status(404).json({ error: 'Exam not found' })
    res.json(exam)
  }))

  app.post('/api/exams', handle((req, res) => res.status(201).json(saveExam(req.body, dataDir))))

  app.delete('/api/exams/:id', handle((req, res) => {
    if (!getExam(req.params.id, dataDir)) return res.status(404).json({ error: 'Exam not found' })
    res.json(deleteExam(req.params.id, dataDir))
  }))

  app.get('/api/cohorts', handle((req, res) => res.json(listCohorts(dataDir))))

  app.get('/api/cohorts/:id', handle((req, res) => {
    const cohort = getCohort(req.params.id, dataDir)
    if (!cohort) return res.status(404).json({ error: 'Cohort not found' })
    res.json(cohort)
  }))

  app.post('/api/cohorts', handle((req, res) => res.status(201).json(createCohort(req.body, dataDir))))

  app.put('/api/cohorts/:id', handle((req, res) => {
    if (!getCohort(req.params.id, dataDir)) return res.status(404).json({ error: 'Cohort not found' })
    res.json(updateCohort(req.params.id, req.body, dataDir))
  }))

  app.delete('/api/cohorts/:id', handle((req, res) => {
    if (!getCohort(req.params.id, dataDir)) return res.status(404).json({ error: 'Cohort not found' })
    res.json(deleteCohort(req.params.id, dataDir))
  }))

  app.get('/api/students', handle((req, res) => res.json(listStudents(dataDir))))

  app.get('/api/students/:id/history', handle((req, res) => {
    const history = getStudentHistory(req.params.id, dataDir)
    if (!history) return res.status(404).json({ error: 'Student not found' })
    res.json(history)
  }))

  app.get('/api/settings', handle((req, res) => res.json(getSettings(dataDir))))
  app.put('/api/settings', handle((req, res) => res.json(saveSettings(req.body, dataDir))))

  app.get('/api/backup', handle((req, res) => res.json(exportBackup(dataDir))))
  app.post('/api/restore', handle((req, res) => res.json(restoreBackup(req.body, dataDir))))

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }))

  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath))
    app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(distPath, 'index.html')))
  }
  return app
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const port = process.env.PORT || 3001
  createApp().listen(port, () => console.log(`Dimension Analysis storage listening on port ${port}`))
}
