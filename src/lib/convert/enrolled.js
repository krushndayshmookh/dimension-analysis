import { cleanId, issue, lowerRow } from './common.js'

// The enrolled-students sheet: one row per student with an id and a name.
export function readEnrolled(parsed) {
  const students = []
  const seen = new Set()
  const issues = []
  ;(parsed.data ?? []).forEach((raw, index) => {
    const row = lowerRow(raw)
    const id = cleanId(row.student_id)
    if (!id) {
      if (row.student_name) issues.push(issue('warning', `Enrolled students row ${index + 2}: no student_id for "${row.student_name}"`))
      return
    }
    if (seen.has(id)) {
      issues.push(issue('warning', `Enrolled students: student ${id} appears more than once; the first row was kept`))
      return
    }
    seen.add(id)
    students.push({ id, name: row.student_name })
  })
  return { students, issues }
}
