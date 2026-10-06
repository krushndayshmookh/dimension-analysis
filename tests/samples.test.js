import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCsv } from '../src/lib/csv.js'
import { readDataset } from '../src/lib/input.js'
import { analyzeDataset } from '../src/lib/analysis.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (...parts) => parseCsv(fs.readFileSync(path.join(root, ...parts), 'utf8'))

// Every example shipped in the repo must satisfy the documented format.
for (const [folder, students, questions] of [
  ['samples/small', 12, 20],
  ['samples/large', 300, 25],
  ['templates', 2, 2],
]) {
  describe(`${folder} files`, () => {
    it('are accepted by the strict reader and can be analyzed', async () => {
      const answersFile = path.join(root, folder, 'student_answers.csv')
      const result = readDataset({
        config: await read(folder, 'exam_config.csv'),
        scores: await read(folder, 'student_scores.csv'),
        students: await read(folder, 'students.csv'),
        answers: fs.existsSync(answersFile) ? await read(folder, 'student_answers.csv') : null,
      })
      assert.deepEqual(result.errors, [])
      assert.deepEqual(result.warnings, [])
      assert.equal(result.dataset.students.length, students)
      assert.equal(result.dataset.questions.length, questions)
      assert.equal(result.dataset.students.some((s) => s.answers), fs.existsSync(answersFile), 'answers are read when the file exists')

      const { profiles, paper } = analyzeDataset(result.dataset)
      assert.equal(profiles.students.length, students)
      assert.equal(paper.questions.rows.length, questions)
    })
  })
}
