import { DIFFICULTIES, DIMENSIONS, LIST_SEPARATOR } from '../constants.js'
import { lowerRow } from './common.js'

// The listing sheet's vocabulary mapped onto ours.
const DIFFICULTY_ALIASES = { med: 'medium', moderate: 'medium' }
const DIMENSION_ALIASES = { comprehension: 'Comprehend' }
const TYPES = ['assignment', 'assessment']

const splitList = (value) => value.split(LIST_SEPARATOR).map((part) => part.trim()).filter(Boolean)
// Topics in the listing end with the id of the topic page: "SQL Joins 2171".
const stripTopicId = (topic) => topic.replace(/\s+\d+$/, '')

function solveRateOf(row) {
  const key = Object.keys(row).find((k) => k.includes('solve rate'))
  return key ? row[key] : ''
}

// Returns every row of the sheet as a question with the problems found in it.
// The rows are never dropped: the instructor decides what to keep.
export function readListing(parsed) {
  const seen = new Set()
  const questions = (parsed.data ?? []).flatMap((raw, index) => {
    const row = lowerRow(raw)
    if (Object.values(row).every((v) => v === '')) return []
    const problems = []

    const id = row['question id']
    if (!id) problems.push('no question id')
    else if (seen.has(id)) problems.push(`question id ${id} appears more than once`)
    seen.add(id)

    const typeText = row.type.toLowerCase()
    const type = TYPES.includes(typeText) ? typeText : ''
    if (!type) problems.push(typeText ? `type "${row.type}" must be Assignment or Assessment` : 'no type')

    const set = row.set
    if (!set) problems.push('no set')

    const difficultyText = row.difficulty.toLowerCase()
    const difficulty = DIFFICULTY_ALIASES[difficultyText] ?? difficultyText
    if (!DIFFICULTIES.includes(difficulty)) problems.push(row.difficulty ? `difficulty "${row.difficulty}" is not recognised` : 'no difficulty')

    const dimensions = []
    for (const name of splitList(row.dimensions ?? '')) {
      const mapped = DIMENSION_ALIASES[name.toLowerCase()] ?? DIMENSIONS.find((d) => d.toLowerCase() === name.toLowerCase())
      if (mapped) dimensions.push(mapped)
      else problems.push(`dimension "${name}" is not recognised`)
    }
    if (!dimensions.length && !problems.some((p) => p.startsWith('dimension'))) problems.push('no dimension')

    const topics = splitList(row.topics ?? '').map(stripTopicId).filter(Boolean)
    if (!topics.length) problems.push('no topic')

    const expectedSolveRate = solveRateOf(row)
    if (expectedSolveRate !== '' && !(Number(expectedSolveRate) >= 0 && Number(expectedSolveRate) <= 100)) {
      problems.push(`solve rate "${expectedSolveRate}" must be a percentage from 0 to 100`)
    }

    return [{ row: index + 2, id, passage: row.comprehensionid ?? '', type, set, difficulty, dimensions, topics, expectedSolveRate, problems }]
  })

  // Questions on one passage share its topics: borrow them when a question has none.
  const topicsByPassage = new Map()
  for (const q of questions) if (q.passage && q.topics.length && !topicsByPassage.has(q.passage)) topicsByPassage.set(q.passage, q.topics)
  for (const q of questions) {
    if (q.topics.length || !topicsByPassage.has(q.passage)) continue
    q.topics = topicsByPassage.get(q.passage)
    q.problems = q.problems.filter((p) => p !== 'no topic')
  }
  return { questions }
}
