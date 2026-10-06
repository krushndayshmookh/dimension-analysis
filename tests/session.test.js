import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionStore } from '../src/stores/session.js'
import { loadDataset } from './fixtures.js'

describe('session store', () => {
  let store
  beforeEach(async () => {
    setActivePinia(createPinia())
    store = useSessionStore()
  })
  const open = async () => store.openExam({ courseName: 'C', examTitle: 'E', examDate: '2026-01-01', dataset: await loadDataset() })

  it('starts on the dashboard with no exam', () => {
    assert.equal(store.tab, 'dashboard')
    assert.equal(store.exam, null)
  })

  it('closing the exam clears it and returns to the dashboard', async () => {
    await open()
    store.tab = 'paper'
    const key = store.examKey
    store.closeExam()
    assert.equal(store.exam, null)
    assert.equal(store.profiles, null)
    assert.equal(store.selectedStudentId, '')
    assert.equal(store.tab, 'dashboard')
    assert.ok(store.examKey > key, 'cached pages of the closed exam are discarded')
  })

  it('can open another exam after closing one', async () => {
    await open()
    store.closeExam()
    await open()
    assert.ok(store.exam)
    assert.equal(store.selectedStudentId, 'S1')
  })
})
