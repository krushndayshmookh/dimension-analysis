import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  saveExam,
  getExam,
  getIndex,
  deleteExam,
  listStudents,
  getStudentHistory,
  getSettings,
  saveSettings,
} from '../server/storage.js'
import { createApp } from '../server/server.js'
import { loadDataset } from './fixtures.js'
import { buildProfiles } from '../src/lib/profiles.js'

let dataDir
let dataset
let analysis

beforeEach(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dimension-analysis-'))
  dataset = await loadDataset()
  analysis = buildProfiles(dataset)
})

afterEach(() => {
  fs.rmSync(dataDir, { recursive: true, force: true })
})

const payload = (overrides = {}) => ({
  courseName: 'CS101',
  examTitle: 'Midterm',
  examDate: '2026-03-01',
  dataset,
  analysis,
  ...overrides,
})

describe('storage', () => {
  it('saves an exam and returns its id', () => {
    const { id } = saveExam(payload(), dataDir)
    assert.ok(id)
    const exam = getExam(id, dataDir)
    assert.equal(exam.courseName, 'CS101')
    assert.equal(exam.dataset.students.length, 3)
    assert.deepEqual(exam.analysis.cohort, analysis.cohort)
  })

  it('trusts the analysis sent by the client rather than recomputing it', () => {
    const custom = { ...analysis, cohort: { ...analysis.cohort, masteryPct: 12.34 } }
    const { id } = saveExam(payload({ analysis: custom }), dataDir)
    assert.equal(getExam(id, dataDir).analysis.cohort.masteryPct, 12.34)
  })

  it('maintains an index with summary fields', () => {
    const { id } = saveExam(payload(), dataDir)
    const [entry] = getIndex(dataDir)
    assert.equal(entry.id, id)
    assert.equal(entry.studentCount, 3)
    assert.equal(entry.questionCount, 3)
    assert.equal(entry.avgMasteryPct, analysis.cohort.masteryPct)
    assert.equal(entry.examTitle, 'Midterm')
  })

  it('keeps the per-question summaries in the exam and in its index entry', () => {
    const questionSummaries = [{ id: 'Q1', type: 'assessment', solveRatePct: 66.67 }]
    const { id } = saveExam(payload({ questionSummaries }), dataDir)
    assert.deepEqual(getExam(id, dataDir).questionSummaries, questionSummaries)
    assert.deepEqual(getIndex(dataDir)[0].questionSummaries, questionSummaries)
  })

  it('defaults the question summaries to an empty list', () => {
    const { id } = saveExam(payload(), dataDir)
    assert.deepEqual(getIndex(dataDir)[0].questionSummaries, [])
    assert.deepEqual(getExam(id, dataDir).questionSummaries, [])
  })

  it('rejects question summaries that are not a list', () => {
    assert.throws(() => saveExam(payload({ questionSummaries: 'x' }), dataDir), /questionSummaries/)
  })

  it('replaces the index entry when saving an existing id', () => {
    const { id } = saveExam(payload(), dataDir)
    saveExam(payload({ id, examTitle: 'Renamed' }), dataDir)
    const index = getIndex(dataDir)
    assert.equal(index.length, 1)
    assert.equal(index[0].examTitle, 'Renamed')
  })

  it('lists newest first', () => {
    const a = saveExam(payload({ id: 'a' }), dataDir)
    const b = saveExam(payload({ id: 'b' }), dataDir)
    assert.deepEqual(getIndex(dataDir).map((e) => e.id), [b.id, a.id])
  })

  it('rejects a payload without a dataset or analysis', () => {
    assert.throws(() => saveExam({ courseName: 'x' }, dataDir), /dataset/)
    assert.throws(() => saveExam(payload({ analysis: null }), dataDir), /analysis/)
  })

  it('returns null for a missing exam', () => {
    assert.equal(getExam('nope', dataDir), null)
  })

  it('does not reset the index when it is corrupt', () => {
    saveExam(payload(), dataDir)
    fs.writeFileSync(path.join(dataDir, 'index.json'), '{not json')
    assert.throws(() => getIndex(dataDir), /index/i)
  })

  it('writes atomically, leaving no temporary files behind', () => {
    saveExam(payload(), dataDir)
    const leftovers = fs.readdirSync(dataDir, { recursive: true }).filter((f) => String(f).endsWith('.tmp'))
    assert.deepEqual(leftovers, [])
  })

  it('handles student ids that are not safe file names', async () => {
    const odd = structuredClone(dataset)
    odd.students[0].id = 'a/b c'
    const oddAnalysis = buildProfiles(odd)
    saveExam(payload({ dataset: odd, analysis: oddAnalysis }), dataDir)
    assert.ok(getStudentHistory('a/b c', dataDir))
  })
})

describe('student history', () => {
  it('records one entry per exam per student across exams', () => {
    saveExam(payload({ id: 'e1', examDate: '2026-02-01' }), dataDir)
    saveExam(payload({ id: 'e2', examDate: '2026-04-01', examTitle: 'Final' }), dataDir)
    const history = getStudentHistory('S1', dataDir)
    assert.equal(history.name, 'Alice')
    assert.deepEqual(history.exams.map((e) => e.examId), ['e1', 'e2'])
    const entry = history.exams[1]
    assert.equal(entry.examTitle, 'Final')
    assert.equal(entry.masteryPct, 100)
    assert.equal(entry.totalMarks, 16)
    assert.equal(entry.dimensions.Recall.masteryPct, 100)
  })

  it('returns exams ordered by exam date, not save order', () => {
    saveExam(payload({ id: 'late', examDate: '2026-09-01' }), dataDir)
    saveExam(payload({ id: 'early', examDate: '2026-01-01' }), dataDir)
    assert.deepEqual(getStudentHistory('S1', dataDir).exams.map((e) => e.examId), ['early', 'late'])
  })

  it('does not duplicate an exam entry when the exam is saved again', () => {
    saveExam(payload({ id: 'e1' }), dataDir)
    saveExam(payload({ id: 'e1' }), dataDir)
    assert.equal(getStudentHistory('S1', dataDir).exams.length, 1)
  })

  it('lists students with exam counts, sorted by name', () => {
    saveExam(payload({ id: 'e1' }), dataDir)
    const students = listStudents(dataDir)
    assert.deepEqual(students.map((s) => [s.id, s.name, s.examCount]), [['S1', 'Alice', 1], ['S2', 'Bob', 1], ['S3', 'Cara', 1]])
  })

  it('removes an exam from the index and from student histories when deleted', () => {
    saveExam(payload({ id: 'e1' }), dataDir)
    saveExam(payload({ id: 'e2' }), dataDir)
    deleteExam('e1', dataDir)
    assert.equal(getExam('e1', dataDir), null)
    assert.deepEqual(getIndex(dataDir).map((e) => e.id), ['e2'])
    assert.deepEqual(getStudentHistory('S1', dataDir).exams.map((e) => e.examId), ['e2'])
  })

  it('returns null for an unknown student', () => {
    assert.equal(getStudentHistory('ghost', dataDir), null)
  })
})

describe('http api', () => {
  let server
  let base

  beforeEach(async () => {
    server = createApp({ dataDir }).listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    base = `http://127.0.0.1:${server.address().port}`
  })

  afterEach(() => new Promise((resolve) => server.close(resolve)))

  const post = (body) =>
    fetch(`${base}/api/exams`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

  it('saves, lists, loads and deletes exams', async () => {
    const created = await post(payload())
    assert.equal(created.status, 201)
    const { id } = await created.json()

    const list = await (await fetch(`${base}/api/exams`)).json()
    assert.equal(list.length, 1)

    const exam = await (await fetch(`${base}/api/exams/${id}`)).json()
    assert.equal(exam.examTitle, 'Midterm')

    const students = await (await fetch(`${base}/api/students`)).json()
    assert.equal(students.length, 3)
    const history = await (await fetch(`${base}/api/students/S1/history`)).json()
    assert.equal(history.exams.length, 1)

    assert.equal((await fetch(`${base}/api/exams/${id}`, { method: 'DELETE' })).status, 200)
    assert.equal((await fetch(`${base}/api/exams/${id}`)).status, 404)
  })

  it('responds 400 to an invalid payload and 404 to unknown resources', async () => {
    assert.equal((await post({ courseName: 'x' })).status, 400)
    assert.equal((await fetch(`${base}/api/exams/missing`, { method: 'DELETE' })).status, 404)
    assert.equal((await fetch(`${base}/api/students/missing/history`)).status, 404)
  })

  it('no longer serves sample data', async () => {
    assert.equal((await fetch(`${base}/api/samples`)).status, 404)
  })
})

describe('settings storage', () => {
  it('returns an empty object when nothing has been saved', () => {
    assert.deepEqual(getSettings(dataDir), {})
  })

  it('saves and returns settings exactly as given', () => {
    saveSettings({ mastery: { weakBelow: 45 }, showVerdicts: false }, dataDir)
    assert.deepEqual(getSettings(dataDir), { mastery: { weakBelow: 45 }, showVerdicts: false })
  })

  it('rejects anything that is not an object', () => {
    for (const bad of [null, 'x', [1], 3]) assert.throws(() => saveSettings(bad, dataDir), /object/)
  })

  it('is served over http', async () => {
    const server = createApp({ dataDir }).listen(0)
    await new Promise((r) => server.once('listening', r))
    const base = `http://127.0.0.1:${server.address().port}`
    try {
      assert.deepEqual(await (await fetch(`${base}/api/settings`)).json(), {})
      const put = await fetch(`${base}/api/settings`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trend: { notableChangePp: 7 } }),
      })
      assert.equal(put.status, 200)
      assert.deepEqual(await (await fetch(`${base}/api/settings`)).json(), { trend: { notableChangePp: 7 } })
      const bad = await fetch(`${base}/api/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '[1]' })
      assert.equal(bad.status, 400)
    } finally {
      await new Promise((r) => server.close(r))
    }
  })
})

describe('backup and restore', () => {
  it('exports settings and every exam, and restores them into an empty data folder', async () => {
    saveSettings({ trend: { notableChangePp: 7 } }, dataDir)
    saveExam(payload({ id: 'e1', examTitle: 'One' }), dataDir)
    saveExam(payload({ id: 'e2', examTitle: 'Two', examDate: '2026-05-01' }), dataDir)
    const { exportBackup, restoreBackup } = await import('../server/storage.js')
    const backup = exportBackup(dataDir)
    assert.equal(backup.version, 1)
    assert.deepEqual(backup.exams.map((e) => e.id).sort(), ['e1', 'e2'])
    assert.deepEqual(backup.settings, { trend: { notableChangePp: 7 } })

    const other = fs.mkdtempSync(path.join(os.tmpdir(), 'dimension-analysis-restore-'))
    try {
      const result = restoreBackup(JSON.parse(JSON.stringify(backup)), other)
      assert.deepEqual(result, { success: true, exams: 2 })
      assert.deepEqual(getIndex(other).map((e) => e.id).sort(), ['e1', 'e2'])
      assert.deepEqual(getSettings(other), { trend: { notableChangePp: 7 } })
      assert.equal(getStudentHistory('S1', other).exams.length, 2, 'student histories are rebuilt')
      assert.equal(getExam('e1', other).examTitle, 'One')
    } finally {
      fs.rmSync(other, { recursive: true, force: true })
    }
  })

  it('keeps each exam’s original creation time', async () => {
    const { exportBackup, restoreBackup } = await import('../server/storage.js')
    saveExam(payload({ id: 'e1' }), dataDir)
    const backup = exportBackup(dataDir)
    backup.exams[0].createdAt = '2025-01-02T03:04:05.000Z'
    restoreBackup(backup, dataDir)
    assert.equal(getExam('e1', dataDir).createdAt, '2025-01-02T03:04:05.000Z')
  })

  it('merges into existing data, replacing exams with the same id', async () => {
    const { exportBackup, restoreBackup } = await import('../server/storage.js')
    saveExam(payload({ id: 'e1', examTitle: 'Old title' }), dataDir)
    const backup = exportBackup(dataDir)
    saveExam(payload({ id: 'e1', examTitle: 'Changed' }), dataDir)
    saveExam(payload({ id: 'e3' }), dataDir)
    restoreBackup(backup, dataDir)
    assert.equal(getExam('e1', dataDir).examTitle, 'Old title')
    assert.ok(getExam('e3', dataDir), 'exams not in the backup are kept')
  })

  it('rejects anything that is not a backup', async () => {
    const { restoreBackup } = await import('../server/storage.js')
    for (const bad of [null, 'x', {}, { version: 2, exams: [] }, { version: 1, exams: 'x' }]) {
      assert.throws(() => restoreBackup(bad, dataDir), /backup/i)
    }
  })

  it('is served over http', async () => {
    saveExam(payload({ id: 'e1' }), dataDir)
    const server = createApp({ dataDir }).listen(0)
    await new Promise((r) => server.once('listening', r))
    const base = `http://127.0.0.1:${server.address().port}`
    try {
      const backup = await (await fetch(`${base}/api/backup`)).json()
      assert.equal(backup.exams.length, 1)
      const restored = await fetch(`${base}/api/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(backup) })
      assert.equal(restored.status, 200)
      const bad = await fetch(`${base}/api/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"version":9}' })
      assert.equal(bad.status, 400)
    } finally {
      await new Promise((r) => server.close(r))
    }
  })
})
