import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCsv } from '../src/lib/csv.js'
import { readAttendance, readDataset, readStudentNames } from '../src/lib/input.js'
import { analyzeDataset } from '../src/lib/analysis.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (...parts) => parseCsv(fs.readFileSync(path.join(root, ...parts), 'utf8'))

// Every example shipped in the repo must satisfy the documented format.
for (const [folder, students, questions, hasMcq] of [
  ['samples/small', 12, 20, false],
  ['samples/large', 300, 25, true],
  ['templates', 2, 2, true],
]) {
  describe(`${folder} files`, () => {
    it('are accepted by the strict reader and can be analyzed', async () => {
      const cohort = readStudentNames(await read(folder, 'students.csv'))
      assert.deepEqual(cohort.errors, [])
      const attendanceFile = path.join(root, folder, 'attendance.csv')
      const attendance = fs.existsSync(attendanceFile) ? await read(folder, 'attendance.csv') : null
      if (attendance) assert.deepEqual(readAttendance(attendance).errors, [])
      const result = readDataset({
        config: await read(folder, 'exam_config.csv'),
        scores: await read(folder, 'student_scores.csv'),
        cohort: cohort.students,
        attendance,
      })
      assert.deepEqual(result.errors, [])
      assert.deepEqual(result.warnings, [])
      assert.equal(result.dataset.students.length, students)
      assert.equal(result.dataset.questions.length, questions)
      assert.equal(result.dataset.students.some((s) => s.answers), hasMcq, 'chosen options are read for mcq questions')
      assert.ok(!fs.existsSync(path.join(root, folder, 'student_answers.csv')), 'no separate answers file')

      const { profiles, paper } = analyzeDataset(result.dataset)
      assert.equal(profiles.students.length, students)
      assert.equal(paper.questions.rows.length, questions)
    })
  })
}
