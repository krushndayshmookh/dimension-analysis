import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeDistractors } from '../src/lib/distractors.js'
import { distractorFlags } from '../src/lib/verdicts.js'
import { DEFAULT_SETTINGS as S, setPath } from '../src/lib/settings.js'
import { closeTo } from './fixtures.js'

const makeDataset = (keys, answersByStudent) => {
  const questions = Object.entries(keys).map(([id, correctOption]) => ({
    id, type: 'assessment', difficulty: 'easy', dimensions: ['Recall'], topics: ['T'], marks: 1, expectedSolveRate: null, subtype: 'mcq', correctOption,
  }))
  const students = Object.entries(answersByStudent).map(([id, answers]) => ({
    id, name: id, section: null,
    answers: Object.fromEntries(Object.entries(answers).filter(([, o]) => o)),
    scores: Object.fromEntries(Object.entries(answers).filter(([, o]) => o).map(([q, o]) => [q, o === keys[q] ? 1 : 0])),
  }))
  return { questions, students }
}

// Totals: S1-S3 = 2, S4/S5/S10 = 1, S6-S9 = 0. Top 3 = S1-S3; bottom 3 = S7-S9.
const dataset = makeDataset({ Q1: 'B', Q2: 'A' }, {
  S1: { Q1: 'B', Q2: 'A' }, S2: { Q1: 'B', Q2: 'A' }, S3: { Q1: 'B', Q2: 'A' },
  S4: { Q1: 'C', Q2: 'A' }, S5: { Q1: 'C', Q2: 'A' }, S6: { Q1: 'A', Q2: 'B' },
  S7: { Q1: 'A', Q2: 'B' }, S8: { Q1: 'D', Q2: 'C' }, S9: { Q1: '', Q2: 'C' }, S10: { Q1: 'B', Q2: 'C' },
})

describe('analyzeDistractors', () => {
  const result = analyzeDistractors(dataset)
  const q1 = result.questions.find((q) => q.id === 'Q1')
  const option = (q, o) => q.options.find((x) => x.option === o)

  it('analyses only mcq questions', () => {
    assert.equal(result.available, true)
    assert.deepEqual(result.questions.map((q) => q.id), ['Q1', 'Q2'])
    const noKeys = analyzeDistractors({ ...dataset, questions: dataset.questions.map((q) => ({ ...q, subtype: null, correctOption: null })) })
    assert.deepEqual([noKeys.available, noKeys.questions], [false, []])
  })

  it('counts who chose each option, and who left it blank', () => {
    assert.equal(q1.correctOption, 'B')
    assert.deepEqual([q1.answered, q1.blank], [9, 1])
    assert.deepEqual(q1.options.map((o) => [o.option, o.count]), [['A', 2], ['B', 4], ['C', 2], ['D', 1]])
    assert.deepEqual(q1.options.filter((o) => o.isCorrect).map((o) => o.option), ['B'])
  })

  it('gives each option’s share of the students who answered', () => {
    assert.ok(closeTo(option(q1, 'B').pctOfAnswered, 44.44))
    assert.ok(closeTo(option(q1, 'D').pctOfAnswered, 11.11))
    assert.ok(closeTo(q1.correctPctOfAnswered, 44.44))
  })

  it('gives each option’s share among the top and the bottom 27% of students by total score', () => {
    assert.equal(q1.groupSize, 3)
    assert.equal(option(q1, 'B').pctTop, 100)
    assert.equal(option(q1, 'B').pctBottom, 0)
    assert.equal(option(q1, 'A').pctBottom, 50, 'S7 chose A; S9 left it blank, so two students answered')
    assert.equal(option(q1, 'D').pctBottom, 50)
  })

  it('lists the correct option even when nobody chose it', () => {
    const none = analyzeDistractors(makeDataset({ Q1: 'E' }, { S1: { Q1: 'A' }, S2: { Q1: 'B' } }))
    assert.deepEqual(none.questions[0].options.map((o) => [o.option, o.count, o.isCorrect]), [['A', 1, false], ['B', 1, false], ['E', 0, true]])
  })

  it('reports no shares when nobody answered', () => {
    const empty = analyzeDistractors(makeDataset({ Q1: 'A' }, { S1: { Q1: '' }, S2: { Q1: '' } }))
    assert.equal(empty.questions[0].options[0].pctOfAnswered, null)
    assert.equal(empty.questions[0].correctPctOfAnswered, null)
  })
})

describe('distractorFlags', () => {
  const analysisOf = (d) => analyzeDistractors(d).questions[0]
  const ids = (q, settings = S) => distractorFlags(q, settings).map((f) => f.id)

  it('flags wrong options almost nobody chose, using the configured limit', () => {
    const q1 = analyzeDistractors(dataset).questions[0]
    assert.deepEqual(ids(q1), [])
    const strict = setPath(S, 'distractors.nonFunctioningBelow', 15)
    const flag = distractorFlags(q1, strict).find((f) => f.id === 'non-functioning')
    assert.deepEqual([flag.label, flag.tone], ['Rarely chosen: D', 'info'])
  })

  it('flags a wrong option that top students prefer to the key', () => {
    // Q1 key A: top students (T1, T2) choose B; the others choose A.
    const miskeyed = makeDataset({ Q1: 'A', Q2: 'A', Q3: 'A' }, {
      T1: { Q1: 'B', Q2: 'A', Q3: 'A' }, T2: { Q1: 'B', Q2: 'A', Q3: 'A' },
      M1: { Q1: 'A', Q2: 'B', Q3: 'A' }, M2: { Q1: 'A', Q2: 'A', Q3: 'B' },
      L1: { Q1: 'A', Q2: 'B', Q3: 'B' }, L2: { Q1: 'A', Q2: 'B', Q3: 'B' },
    })
    const flag = distractorFlags(analysisOf(miskeyed), S).find((f) => f.id === 'top-prefers-wrong')
    assert.deepEqual([flag.label, flag.tone], ['Top students prefer B', 'bad'])
  })

  it('flags a wrong option chosen by more students than the key', () => {
    const popular = makeDataset({ Q1: 'A' }, {
      S1: { Q1: 'B' }, S2: { Q1: 'B' }, S3: { Q1: 'B' }, S4: { Q1: 'A' }, S5: { Q1: 'A' },
    })
    const flag = distractorFlags(analysisOf(popular), S).find((f) => f.id === 'wrong-most-popular')
    assert.deepEqual([flag.label, flag.tone], ['B chosen more than the key', 'warn'])
  })
})
