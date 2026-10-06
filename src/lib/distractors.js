import { round } from './stats.js'

const GROUP_FRACTION = 0.27
const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
const share = (count, of) => (of ? round((count / of) * 100) : null)

// How often each option of a multiple-choice (mcq) question was chosen, overall
// and among the top and bottom 27% of students by total score. Needs students'
// `answers`, which come from the option cells of the scores file.
export function analyzeDistractors(dataset) {
  const keyed = dataset.questions.filter((q) => q.subtype === 'mcq')
  const students = dataset.students
  if (!keyed.length || !students.some((s) => s.answers)) return { available: false, questions: [] }

  const n = students.length
  const totals = students.map((s) => Object.values(s.scores).reduce((a, b) => a + b, 0))
  const groupSize = Math.max(1, Math.round(n * GROUP_FRACTION))
  const order = totals.map((total, index) => ({ total, index })).sort((a, b) => b.total - a.total || a.index - b.index)
  const top = new Set(order.slice(0, groupSize).map((o) => o.index))
  const bottom = new Set(order.slice(n - groupSize).map((o) => o.index))

  const questions = keyed.map((q) => {
    const chosen = students.map((s) => s.answers?.[q.id] ?? null)
    const answeredIdx = chosen.map((o, i) => (o ? i : -1)).filter((i) => i >= 0)
    const labels = [...new Set([...chosen.filter(Boolean), q.correctOption])].sort(natural)
    const answeredTop = answeredIdx.filter((i) => top.has(i)).length
    const answeredBottom = answeredIdx.filter((i) => bottom.has(i)).length

    const options = labels.map((option) => {
      const idx = answeredIdx.filter((i) => chosen[i] === option)
      return {
        option,
        isCorrect: option === q.correctOption,
        count: idx.length,
        pctOfAnswered: share(idx.length, answeredIdx.length),
        pctTop: share(idx.filter((i) => top.has(i)).length, answeredTop),
        pctBottom: share(idx.filter((i) => bottom.has(i)).length, answeredBottom),
      }
    })
    return {
      id: q.id,
      type: q.type,
      correctOption: q.correctOption,
      answered: answeredIdx.length,
      blank: n - answeredIdx.length,
      groupSize,
      options,
      correctPctOfAnswered: options.find((o) => o.isCorrect).pctOfAnswered,
    }
  })
  return { available: true, questions }
}
