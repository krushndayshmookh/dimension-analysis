import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  createCohort,
  deleteCohort,
  exportBackup,
  getCohort,
  listCohorts,
  restoreBackup,
  saveExam,
  updateCohort,
} from '../server/storage.js'
import { createApp } from '../server/server.js'
import { loadDataset } from './fixtures.js'
import { buildProfiles } from '../src/lib/profiles.js'

let dataDir
beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dimension-analysis-cohorts-'))
})
afterEach(() => fs.rmSync(dataDir, { recursive: true, force: true }))

const students = (...ids) => ids.map((id) => ({ id, name: `Name ${id}`, section: null }))

describe('cohorts', () => {
  it('creates a named cohort holding its students', () => {
    const { id, summary } = createCohort({ name: 'Batch 2026', students: students('S1', 'S2') }, dataDir)
    assert.ok(id)
    assert.deepEqual(summary, { added: 2, updated: 0, unchanged: 0 })
    const cohort = getCohort(id, dataDir)
    assert.equal(cohort.name, 'Batch 2026')
    assert.deepEqual(cohort.students.map((s) => s.id), ['S1', 'S2'])
    assert.ok(cohort.createdAt)
  })

  it('lists cohorts with their size and how many exams use them', async () => {
    const a = createCohort({ name: 'A', students: students('S1', 'S2', 'S3') }, dataDir).id
    createCohort({ name: 'B', students: students('S9') }, dataDir)
    const dataset = await loadDataset()
    saveExam({ cohortId: a, courseName: 'C', examTitle: 'E', dataset, analysis: buildProfiles(dataset) }, dataDir)
    const list = listCohorts(dataDir)
    assert.deepEqual(list.map((c) => [c.name, c.studentCount, c.examCount]), [['A', 3, 1], ['B', 1, 0]])
  })

  it('requires a name and rejects a second cohort with the same name', () => {
    assert.throws(() => createCohort({ name: '  ', students: students('S1') }, dataDir), /name/i)
    createCohort({ name: 'Batch', students: students('S1') }, dataDir)
    assert.throws(() => createCohort({ name: 'batch', students: students('S2') }, dataDir), /already/i)
  })

  it('rejects students without an id or a name, and duplicates within the upload', () => {
    assert.throws(() => createCohort({ name: 'X', students: [{ id: '', name: 'A' }] }, dataDir), /student_id|id/i)
    assert.throws(() => createCohort({ name: 'X', students: [{ id: 'S1', name: '' }] }, dataDir), /name/i)
    assert.throws(() => createCohort({ name: 'X', students: students('S1', 'S1') }, dataDir), /more than once|duplicate/i)
    assert.throws(() => createCohort({ name: 'X', students: 'S1' }, dataDir), /students/i)
  })

  it('merges a new upload by student id: adds, updates and leaves the rest', () => {
    const { id } = createCohort({ name: 'Batch', students: [{ id: 'S1', name: 'Asha', section: 'A' }, { id: 'S2', name: 'Bala', section: null }] }, dataDir)
    const { summary } = updateCohort(id, { students: [{ id: 'S1', name: 'Asha K', section: 'A' }, { id: 'S2', name: 'Bala', section: null }, { id: 'S3', name: 'Chitra', section: 'B' }] }, dataDir)
    assert.deepEqual(summary, { added: 1, updated: 1, unchanged: 1 })
    const cohort = getCohort(id, dataDir)
    assert.deepEqual(cohort.students.map((s) => [s.id, s.name, s.section]), [['S1', 'Asha K', 'A'], ['S2', 'Bala', null], ['S3', 'Chitra', 'B']])
  })

  it('never duplicates a student when the same file is uploaded again', () => {
    const { id } = createCohort({ name: 'Batch', students: students('S1', 'S2') }, dataDir)
    const { summary } = updateCohort(id, { students: students('S1', 'S2') }, dataDir)
    assert.deepEqual(summary, { added: 0, updated: 0, unchanged: 2 })
    assert.equal(getCohort(id, dataDir).students.length, 2)
  })

  it('keeps a student in one cohort only, naming the cohort that has them', () => {
    createCohort({ name: 'First', students: students('S1', 'S2') }, dataDir)
    assert.throws(() => createCohort({ name: 'Second', students: students('S2', 'S5') }, dataDir), /S2.*First/)
    const other = createCohort({ name: 'Third', students: students('S7') }, dataDir).id
    assert.throws(() => updateCohort(other, { students: students('S1') }, dataDir), /S1.*First/)
    assert.equal(getCohort(other, dataDir).students.length, 1, 'a rejected upload changes nothing')
  })

  it('renames a cohort', () => {
    const { id } = createCohort({ name: 'Old', students: students('S1') }, dataDir)
    updateCohort(id, { name: 'New' }, dataDir)
    assert.equal(getCohort(id, dataDir).name, 'New')
    createCohort({ name: 'Taken', students: students('S2') }, dataDir)
    assert.throws(() => updateCohort(id, { name: 'taken' }, dataDir), /already/i)
  })

  it('returns null for an unknown cohort and rejects updating one', () => {
    assert.equal(getCohort('missing', dataDir), null)
    assert.throws(() => updateCohort('missing', { students: [] }, dataDir), /not found/i)
  })

  it('refuses to delete a cohort that exams use, naming them', async () => {
    const { id } = createCohort({ name: 'Batch', students: students('S1', 'S2', 'S3') }, dataDir)
    const dataset = await loadDataset()
    saveExam({ cohortId: id, courseName: 'CS101', examTitle: 'Midterm', dataset, analysis: buildProfiles(dataset) }, dataDir)
    assert.throws(() => deleteCohort(id, dataDir), /Midterm/)
    assert.ok(getCohort(id, dataDir))
  })

  it('deletes a cohort nothing uses, freeing its students', () => {
    const { id } = createCohort({ name: 'Batch', students: students('S1') }, dataDir)
    deleteCohort(id, dataDir)
    assert.equal(getCohort(id, dataDir), null)
    assert.doesNotThrow(() => createCohort({ name: 'Again', students: students('S1') }, dataDir))
  })
})

describe('exams and cohorts', () => {
  it('needs an existing cohort to save an exam', async () => {
    const dataset = await loadDataset()
    const base = { courseName: 'C', examTitle: 'E', dataset, analysis: buildProfiles(dataset) }
    assert.throws(() => saveExam(base, dataDir), /cohort/i)
    assert.throws(() => saveExam({ ...base, cohortId: 'nope' }, dataDir), /cohort/i)
  })

  it('allows the same exam to be saved more than once', async () => {
    const { id: cohortId } = createCohort({ name: 'Batch', students: students('S1', 'S2', 'S3') }, dataDir)
    const dataset = await loadDataset()
    const payload = { cohortId, courseName: 'C', examTitle: 'E', examDate: '2026-01-01', dataset, analysis: buildProfiles(dataset) }
    const a = saveExam(payload, dataDir).id
    const b = saveExam(payload, dataDir).id
    assert.notEqual(a, b)
    assert.equal(listCohorts(dataDir)[0].examCount, 2)
  })
})

describe('backup with cohorts', () => {
  it('exports and restores cohorts along with the exams', async () => {
    const { id: cohortId } = createCohort({ name: 'Batch', students: students('S1', 'S2', 'S3') }, dataDir)
    const dataset = await loadDataset()
    saveExam({ cohortId, courseName: 'C', examTitle: 'E', dataset, analysis: buildProfiles(dataset) }, dataDir)
    const backup = JSON.parse(JSON.stringify(exportBackup(dataDir)))
    assert.equal(backup.cohorts.length, 1)

    const other = fs.mkdtempSync(path.join(os.tmpdir(), 'dimension-analysis-restore-'))
    try {
      restoreBackup(backup, other)
      assert.deepEqual(listCohorts(other).map((c) => [c.name, c.studentCount, c.examCount]), [['Batch', 3, 1]])
    } finally {
      fs.rmSync(other, { recursive: true, force: true })
    }
  })
})

describe('cohorts over http', () => {
  it('creates, merges, lists and deletes', async () => {
    const server = createApp({ dataDir }).listen(0)
    await new Promise((r) => server.once('listening', r))
    const base = `http://127.0.0.1:${server.address().port}`
    const send = (method, url, body) => fetch(`${base}${url}`, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) })
    try {
      const created = await send('POST', '/api/cohorts', { name: 'Batch', students: students('S1', 'S2') })
      assert.equal(created.status, 201)
      const { id } = await created.json()
      assert.equal((await send('POST', '/api/cohorts', { name: 'batch', students: students('S3') })).status, 400)

      const merged = await send('PUT', `/api/cohorts/${id}`, { students: students('S2', 'S3') })
      assert.deepEqual((await merged.json()).summary, { added: 1, updated: 0, unchanged: 1 })
      const list = await (await send('GET', '/api/cohorts')).json()
      assert.deepEqual(list.map((c) => c.studentCount), [3])
      assert.equal((await (await send('GET', `/api/cohorts/${id}`)).json()).students.length, 3)
      assert.equal((await send('GET', '/api/cohorts/missing')).status, 404)

      assert.equal((await send('DELETE', `/api/cohorts/${id}`)).status, 200)
      assert.equal((await send('DELETE', `/api/cohorts/${id}`)).status, 404)
    } finally {
      await new Promise((r) => server.close(r))
    }
  })
})
