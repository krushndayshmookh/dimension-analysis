import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeItems } from '../src/lib/items.js'
import { closeTo } from './fixtures.js'

// Three 1-mark items, four students; totals are 3, 2, 1, 0.
const dataset = (rows) => ({
  questions: Object.keys(rows[0].scores).map((id) => ({
    id, type: 'MCQ', difficulty: 'easy', dimensions: ['Recall'], topics: ['T'], marks: 1, expectedSolveRate: null,
  })),
  students: rows.map((r) => ({ id: r.id, name: r.id, scores: r.scores })),
})

const staircase = dataset([
  { id: 'A', scores: { Q1: 1, Q2: 1, Q3: 1 } },
  { id: 'B', scores: { Q1: 1, Q2: 0, Q3: 1 } },
  { id: 'C', scores: { Q1: 0, Q2: 1, Q3: 0 } },
  { id: 'D', scores: { Q1: 0, Q2: 0, Q3: 0 } },
])

describe('reliability', () => {
  it('computes Cronbach’s alpha and the standard error of measurement', () => {
    const { reliability } = analyzeItems(staircase)
    assert.ok(closeTo(reliability.alpha, 0.6), `alpha ${reliability.alpha}`)
    assert.ok(closeTo(reliability.sem, 0.82), `sem ${reliability.sem}`)
    assert.equal(reliability.itemCount, 3)
    assert.equal(reliability.studentCount, 4)
  })

  it('is null when it cannot be computed', () => {
    const single = analyzeItems(dataset([{ id: 'A', scores: { Q1: 1 } }, { id: 'B', scores: { Q1: 0 } }]))
    assert.equal(single.reliability.alpha, null, 'one item')
    const flat = analyzeItems(dataset([{ id: 'A', scores: { Q1: 1, Q2: 1 } }, { id: 'B', scores: { Q1: 1, Q2: 1 } }]))
    assert.equal(flat.reliability.alpha, null, 'no variance in totals')
    assert.equal(flat.reliability.sem, null)
  })

  it('treats an unattempted question as zero, as mastery does', () => {
    const withBlank = dataset([
      { id: 'A', scores: { Q1: 1, Q2: 1 } },
      { id: 'B', scores: { Q1: 1 } },
      { id: 'C', scores: { Q1: 0, Q2: 1 } },
    ])
    const filled = dataset([
      { id: 'A', scores: { Q1: 1, Q2: 1 } },
      { id: 'B', scores: { Q1: 1, Q2: 0 } },
      { id: 'C', scores: { Q1: 0, Q2: 1 } },
    ])
    assert.deepEqual(analyzeItems(withBlank).reliability, analyzeItems(filled).reliability)
  })
})

describe('per-question statistics', () => {
  const byId = (result, id) => result.items.find((i) => i.id === id)

  it('computes the upper-lower discrimination index', () => {
    const result = analyzeItems(staircase)
    for (const id of ['Q1', 'Q2', 'Q3']) assert.equal(byId(result, id).discriminationIndex, 1)
  })

  it('is negative when low scorers do better than high scorers on a question', () => {
    const reversed = dataset([
      { id: 'A', scores: { Q1: 1, Q2: 0, Q3: 1 } },
      { id: 'B', scores: { Q1: 1, Q2: 0, Q3: 1 } },
      { id: 'C', scores: { Q1: 0, Q2: 1, Q3: 0 } },
      { id: 'D', scores: { Q1: 0, Q2: 1, Q3: 0 } },
    ])
    const result = analyzeItems(reversed)
    assert.equal(byId(result, 'Q1').discriminationIndex, 1)
    assert.equal(byId(result, 'Q2').discriminationIndex, -1)
  })

  it('computes the item–rest correlation (the item is excluded from the rest score)', () => {
    assert.ok(closeTo(byId(analyzeItems(staircase), 'Q1').itemRestCorrelation, 0.7071, 0.001))
  })

  it('computes alpha with the question removed', () => {
    assert.ok(closeTo(byId(analyzeItems(staircase), 'Q1').alphaIfRemoved, 0))
  })

  it('is null where a statistic is undefined', () => {
    const everyoneCorrect = dataset([
      { id: 'A', scores: { Q1: 1, Q2: 1 } },
      { id: 'B', scores: { Q1: 1, Q2: 0 } },
      { id: 'C', scores: { Q1: 1, Q2: 0 } },
    ])
    const q1 = byId(analyzeItems(everyoneCorrect), 'Q1')
    assert.equal(q1.itemRestCorrelation, null, 'no variance in the item')
  })

  it('returns one row per question in config order', () => {
    assert.deepEqual(analyzeItems(staircase).items.map((i) => i.id), ['Q1', 'Q2', 'Q3'])
  })

  it('uses a single student gracefully', () => {
    const one = analyzeItems(dataset([{ id: 'A', scores: { Q1: 1, Q2: 0 } }]))
    assert.equal(one.items[0].discriminationIndex, null)
    assert.equal(one.reliability.alpha, null)
  })
})
