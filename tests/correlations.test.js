import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { pearson, correlationMatrix, scatterPoints } from '../src/lib/correlations.js'
import { buildProfiles } from '../src/lib/profiles.js'
import { loadDataset, closeTo } from './fixtures.js'

const profilesOf = (columns) => {
  const names = Object.keys(columns)
  const count = columns[names[0]].length
  return {
    dimensions: names,
    difficulties: [],
    topics: [],
    students: Array.from({ length: count }, (_, i) => ({
      id: `S${i + 1}`,
      name: `Student ${i + 1}`,
      dimensions: Object.fromEntries(names.map((n) => [n, { masteryPct: columns[n][i] }])),
    })),
  }
}

describe('pearson', () => {
  it('is 1 for a perfect positive and -1 for a perfect negative relationship', () => {
    assert.equal(pearson([1, 2, 3, 4], [2, 4, 6, 8]), 1)
    assert.equal(pearson([1, 2, 3, 4], [8, 6, 4, 2]), -1)
  })

  it('matches a hand-computed value', () => {
    assert.ok(closeTo(pearson([10, 20, 30, 40, 50], [10, 30, 20, 40, 25]), 0.5657, 0.0005))
  })

  it('is null with fewer than three pairs or no variation', () => {
    assert.equal(pearson([1, 2], [1, 2]), null)
    assert.equal(pearson([1, 2, 3], [5, 5, 5]), null)
  })
})

describe('correlationMatrix', () => {
  const profiles = profilesOf({
    A: [10, 20, 30, 40, 50],
    B: [20, 40, 60, 80, 100],
    C: [50, 40, 30, 20, 10],
    D: [10, 30, 20, 40, 25],
  })
  const result = correlationMatrix(profiles, 'dimensions')

  it('lists the names and a symmetric matrix with 1 on the diagonal', () => {
    assert.deepEqual(result.names, ['A', 'B', 'C', 'D'])
    for (let i = 0; i < 4; i++) {
      assert.equal(result.matrix[i][i], 1)
      for (let j = 0; j < 4; j++) assert.equal(result.matrix[i][j], result.matrix[j][i])
    }
    assert.equal(result.matrix[0][1], 1)
    assert.equal(result.matrix[0][2], -1)
    assert.ok(closeTo(result.matrix[0][3], 0.57))
  })

  it('reports how many students each coefficient is based on', () => {
    assert.equal(result.studentCount, 5)
    assert.equal(result.counts[0][3], 5)
  })

  it('ranks the distinct pairs by strength of relationship', () => {
    assert.equal(result.pairs.length, 6)
    assert.deepEqual(result.pairs.slice(0, 2).map((p) => [p.a, p.b, p.r]), [['A', 'B', 1], ['A', 'C', -1]])
    assert.ok(Math.abs(result.pairs.at(-1).r) <= Math.abs(result.pairs[0].r))
    assert.equal(result.pairs[0].n, 5)
  })

  it('uses only students with values for both measures', () => {
    const gappy = correlationMatrix(profilesOf({ A: [10, 20, 30, 40, 50], B: [20, 40, null, 80, 100] }), 'dimensions')
    assert.equal(gappy.counts[0][1], 4)
    assert.equal(gappy.matrix[0][1], 1)
  })

  it('has null where it cannot be computed', () => {
    const flat = correlationMatrix(profilesOf({ A: [10, 20, 30], B: [5, 5, 5] }), 'dimensions')
    assert.equal(flat.matrix[0][1], null)
    assert.equal(flat.matrix[1][1], null, 'a measure with no variation')
    assert.equal(flat.pairs[0].r, null)
  })

  it('computes on real profiles', async () => {
    const real = correlationMatrix(buildProfiles(await loadDataset()), 'dimensions')
    assert.deepEqual(real.names, ['Recall', 'Comprehend', 'Solve'])
    assert.equal(real.matrix[0][2], 1)
    assert.ok(closeTo(real.matrix[0][1], 0.87))
  })
})

describe('scatterPoints', () => {
  it('returns one point per student with both values', () => {
    const profiles = profilesOf({ A: [10, 20, null], B: [30, 40, 50] })
    assert.deepEqual(scatterPoints(profiles, 'dimensions', 'A', 'B'), [
      { id: 'S1', name: 'Student 1', x: 10, y: 30 },
      { id: 'S2', name: 'Student 2', x: 20, y: 40 },
    ])
  })
})
