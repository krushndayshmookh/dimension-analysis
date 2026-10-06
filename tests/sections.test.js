import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSections } from '../src/lib/sections.js'
import { buildProfiles } from '../src/lib/profiles.js'
import { loadDataset, closeTo } from './fixtures.js'

describe('analyzeSections', () => {
  let result
  before(async () => {
    result = analyzeSections(buildProfiles(await loadDataset()))
  })
  const section = (name) => result.sections.find((s) => s.name === name)

  it('groups students by section', () => {
    assert.equal(result.hasSections, true)
    assert.deepEqual(result.sections.map((s) => [s.name, s.studentCount]), [['A', 2], ['B', 1]])
    assert.deepEqual(section('A').studentIds, ['S1', 'S2'])
  })

  it('describes each section’s mastery', () => {
    assert.ok(closeTo(section('A').mastery.mean, 71.88))
    assert.equal(section('A').mastery.max, 100)
    assert.equal(section('B').mastery.mean, 0)
    assert.equal(section('B').mastery.stdDev, 0)
  })

  it('compares each section with the whole cohort', () => {
    assert.ok(closeTo(result.cohort.mastery.mean, 47.92))
    assert.ok(closeTo(section('A').meanVsCohortPp, 23.96))
    assert.ok(closeTo(section('B').meanVsCohortPp, -47.92))
  })

  it('reports mean mastery per dimension and tier, and the difference from the cohort', () => {
    assert.equal(section('A').dimensions.Recall, 75)
    assert.equal(section('B').dimensions.Recall, 0)
    assert.equal(result.cohort.dimensions.Recall, 50)
    assert.equal(section('A').dimensionVsCohortPp.Recall, 25)
    assert.equal(section('A').difficulties.hard, 75)
  })

  it('reports the share of each section in every decile bin', () => {
    assert.equal(section('A').distribution.length, 10)
    assert.deepEqual([section('A').distribution[4], section('A').distribution[9]], [50, 50])
    assert.equal(section('B').distribution[0], 100)
  })

  it('computes Cohen’s d against the rest of the cohort, null for a single student', () => {
    assert.equal(section('B').cohensD, null)
    assert.equal(section('A').cohensD, null, 'the rest of the cohort is a single student')
  })

  it('tests whether sections differ in overall mastery, and per dimension', () => {
    assert.ok(closeTo(result.anova.p, 0.379, 0.005))
    assert.equal(result.anova.df1, 1)
    assert.deepEqual(result.dimensionTests.map((t) => t.dimension), ['Recall', 'Comprehend', 'Solve'])
    assert.ok(result.dimensionTests.every((t) => t.p == null || (t.p >= 0 && t.p <= 1)))
  })

  it('has no sections when no student has one', async () => {
    const dataset = await loadDataset()
    dataset.students.forEach((s) => delete s.section)
    const none = analyzeSections(buildProfiles(dataset))
    assert.deepEqual([none.hasSections, none.sections, none.anova], [false, [], null])
  })

  it('puts students without a section under "Unassigned", last, when others have one', async () => {
    const dataset = await loadDataset()
    dataset.students[2].section = null
    const mixed = analyzeSections(buildProfiles(dataset))
    assert.deepEqual(mixed.sections.map((s) => s.name), ['A', 'Unassigned'])
    assert.equal(mixed.sections[1].unassigned, true)
  })

  it('sorts section names naturally', async () => {
    const dataset = await loadDataset()
    dataset.students[0].section = 'B10'
    dataset.students[1].section = 'B2'
    dataset.students[2].section = 'B1'
    assert.deepEqual(analyzeSections(buildProfiles(dataset)).sections.map((s) => s.name), ['B1', 'B2', 'B10'])
  })

  it('computes Cohen’s d when both groups have at least two students', async () => {
    const dataset = await loadDataset()
    const extra = (id, section, scores) => ({ id, name: id, section, scores })
    dataset.students.push(extra('S4', 'B', { Q1: 2, Q2: 4, Q3: 10 }), extra('S5', 'B', { Q1: 2, Q2: 4, Q3: 8 }))
    const big = analyzeSections(buildProfiles(dataset))
    assert.equal(typeof big.sections.find((s) => s.name === 'A').cohensD, 'number')
  })
})
