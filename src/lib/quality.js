// Notes about an uploaded dataset that are valid but worth a second look: they
// often mean a column or row was pasted wrongly. They never block an upload.
const LIST_LIMIT = 10

const list = (ids) => (ids.length > LIST_LIMIT ? `${ids.slice(0, LIST_LIMIT).join(', ')}, and ${ids.length - LIST_LIMIT} more` : ids.join(', '))

export function checkDataQuality(dataset, settings) {
  const { questions } = dataset
  const students = dataset.students.filter((s) => !s.absent)
  const warnings = []
  const attemptedCount = (s) => questions.filter((q) => q.id in s.scores).length

  const none = students.filter((s) => attemptedCount(s) === 0)
  if (none.length) warnings.push(`Data check: ${none.length} student(s) attempted no question: ${list(none.map((s) => s.id))}`)

  const zero = students.filter((s) => attemptedCount(s) > 0 && questions.every((q) => !(q.id in s.scores) || s.scores[q.id] === 0))
  if (zero.length) warnings.push(`Data check: ${zero.length} student(s) scored zero on every question they attempted: ${list(zero.map((s) => s.id))}`)

  const limit = settings.quality.heavySkipFrom
  const skippers = students.filter((s) => {
    const attempted = attemptedCount(s)
    return attempted > 0 && ((questions.length - attempted) / questions.length) * 100 >= limit
  })
  if (skippers.length) warnings.push(`Data check: ${skippers.length} student(s) left at least ${limit}% of the questions blank: ${list(skippers.map((s) => s.id))}`)

  const unattempted = questions.filter((q) => students.every((s) => !(q.id in s.scores)))
  if (unattempted.length) warnings.push(`Data check: ${unattempted.length} question(s) no student attempted: ${list(unattempted.map((q) => q.id))}`)

  return warnings
}
