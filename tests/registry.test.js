import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_PAGE, EXAM_LANDING_PAGE, GROUPS, PAGE_META, pagesOf } from '../src/pages/registry.js'

describe('page registry', () => {
  it('groups pages by what the instructor wants to do', () => {
    assert.deepEqual(GROUPS.map((g) => g.label), ['Students', 'Paper', 'Scenarios', 'Over time', 'Data', 'Settings'])
    const labels = (group) => pagesOf(group).map((p) => p.label)
    assert.deepEqual(labels('students'), ['Cohort', 'Student profile', 'Sections', 'Grade bands', 'Correlations', 'Feedback sheets'])
    assert.deepEqual(labels('paper'), ['Paper analysis', 'Question review', 'Distractors'])
    assert.deepEqual(labels('scenarios'), ['Simulation', 'What-if'])
    assert.deepEqual(labels('time'), ['History', 'Compare exams'])
    assert.deepEqual(labels('data'), ['Dashboard', 'Cohorts', 'Upload exam', 'Sheet converter', 'Saved exams'])
    assert.deepEqual(labels('settings'), ['Settings'])
  })

  it('places every page in exactly one existing group, with unique ids', () => {
    const ids = PAGE_META.map((p) => p.id)
    assert.equal(new Set(ids).size, ids.length)
    const groups = new Set(GROUPS.map((g) => g.id))
    for (const page of PAGE_META) assert.ok(groups.has(page.group), `${page.id} is in an unknown group`)
    for (const group of GROUPS) assert.ok(pagesOf(group.id).length, `${group.id} is empty`)
  })

  it('needs an open exam for the analysis pages only', () => {
    const free = PAGE_META.filter((p) => !p.needsExam).map((p) => p.id).sort()
    assert.deepEqual(free, ['cohorts', 'compare', 'convert', 'dashboard', 'history', 'saved', 'settings', 'upload'])
  })

  it('starts on the dashboard and lands on the cohort when an exam is opened', () => {
    assert.equal(DEFAULT_PAGE, 'dashboard')
    assert.equal(EXAM_LANDING_PAGE, 'cohort')
    for (const id of [DEFAULT_PAGE, EXAM_LANDING_PAGE]) assert.ok(PAGE_META.some((p) => p.id === id))
    assert.equal(PAGE_META.find((p) => p.id === DEFAULT_PAGE).needsExam, false)
  })
})
