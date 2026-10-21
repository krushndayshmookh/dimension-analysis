import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createAuth, sameOriginOnly } from './auth.js'
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

// Persistence for the instructors' accounts. The browser app does the analysis;
// this only stores what it sends. Every /api route except sign-in needs a session,
// and each request is confined to the signed-in user's own folder under
// <dataDir>/users/<username>/.
export function createApp({ dataDir = DEFAULT_DATA_DIR } = {}) {
  fs.mkdirSync(dataDir, { recursive: true })
  const app = express()
  app.disable('x-powered-by')
  // Behind nginx/Caddy, set TRUST_PROXY=1 so req.secure and req.ip come from the proxy.
  if (process.env.TRUST_PROXY) app.set('trust proxy', /^\d+$/.test(process.env.TRUST_PROXY) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY)

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'no-referrer')
    if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store')
    next()
  })

  const auth = createAuth(dataDir)
  const ready = new Set()
  app.use('/api', sameOriginOnly)
  app.use('/api/auth', express.json({ limit: '10kb' }), auth.routes)
  app.use('/api', auth.requireUser, (req, res, next) => {
    if (!ready.has(req.dataDir)) {
      ensureDirs(req.dataDir)
      ready.add(req.dataDir)
    }
    next()
  })
  app.use('/api', express.json({ limit: '100mb' }))

  const handle = (fn) => (req, res) => {
    try {
      fn(req, res)
    } catch (err) {
      res.status(err instanceof ValidationError ? 400 : 500).json({ error: err.message })
    }
  }

  app.get('/api/exams', handle((req, res) => res.json(getIndex(req.dataDir))))

  app.get('/api/exams/:id', handle((req, res) => {
    const exam = getExam(req.params.id, req.dataDir)
    if (!exam) return res.status(404).json({ error: 'Exam not found' })
    res.json(exam)
  }))

  app.post('/api/exams', handle((req, res) => res.status(201).json(saveExam(req.body, req.dataDir))))

  app.delete('/api/exams/:id', handle((req, res) => {
    if (!getExam(req.params.id, req.dataDir)) return res.status(404).json({ error: 'Exam not found' })
    res.json(deleteExam(req.params.id, req.dataDir))
  }))

  app.get('/api/cohorts', handle((req, res) => res.json(listCohorts(req.dataDir))))

  app.get('/api/cohorts/:id', handle((req, res) => {
    const cohort = getCohort(req.params.id, req.dataDir)
    if (!cohort) return res.status(404).json({ error: 'Cohort not found' })
    res.json(cohort)
  }))

  app.post('/api/cohorts', handle((req, res) => res.status(201).json(createCohort(req.body, req.dataDir))))

  app.put('/api/cohorts/:id', handle((req, res) => {
    if (!getCohort(req.params.id, req.dataDir)) return res.status(404).json({ error: 'Cohort not found' })
    res.json(updateCohort(req.params.id, req.body, req.dataDir))
  }))

  app.delete('/api/cohorts/:id', handle((req, res) => {
    if (!getCohort(req.params.id, req.dataDir)) return res.status(404).json({ error: 'Cohort not found' })
    res.json(deleteCohort(req.params.id, req.dataDir))
  }))

  app.get('/api/students', handle((req, res) => res.json(listStudents(req.dataDir))))

  app.get('/api/students/:id/history', handle((req, res) => {
    const history = getStudentHistory(req.params.id, req.dataDir)
    if (!history) return res.status(404).json({ error: 'Student not found' })
    res.json(history)
  }))

  app.get('/api/settings', handle((req, res) => res.json(getSettings(req.dataDir))))
  app.put('/api/settings', handle((req, res) => res.json(saveSettings(req.body, req.dataDir))))

  app.get('/api/backup', handle((req, res) => res.json(exportBackup(req.dataDir))))
  app.post('/api/restore', handle((req, res) => res.json(restoreBackup(req.body, req.dataDir))))

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }))

  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath))
    app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(distPath, 'index.html')))
  }
  return app
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const port = process.env.PORT || 3001
  // Loopback only by default: reach it through the tunnel or proxy, not directly from the network.
  const host = process.env.HOST || '127.0.0.1'
  createApp().listen(port, host, () => console.log(`Dimension Analysis listening on http://${host}:${port}`))
}
