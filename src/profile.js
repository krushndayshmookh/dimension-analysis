import Papa from 'papaparse'
import { groupBy, sumBy, mapValues, minBy, maxBy, keyBy, sortBy, round } from 'lodash-es'

// Dimensions: RCSBE
export const DIMENSIONS = {
  R: 'Recall',
  C: 'Comprehend',
  S: 'Solve',
  B: 'Build',
  E: 'Evaluate',
}

export const DIM_ORDER = ['Recall', 'Comprehend', 'Solve', 'Build', 'Evaluate']
export const TIER_ORDER = ['beginner', 'easy', 'medium', 'hard', 'challenge']

const DIM_NAME_MAP = {
  r: 'Recall',
  recall: 'Recall',
  c: 'Comprehend',
  comprehend: 'Comprehend',
  comprehension: 'Comprehend',
  s: 'Solve',
  solve: 'Solve',
  b: 'Build',
  build: 'Build',
  e: 'Evaluate',
  evaluate: 'Evaluate',
  evaluation: 'Evaluate',
}



export const norm = (h) => String(h ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
export const key = (id) => String(id ?? '').trim().toLowerCase()

export const parseCsv = (fileOrString, opts = {}) =>
  new Promise((resolve, reject) => {
    Papa.parse(fileOrString, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
      complete: (results) => resolve(results),
      error: (err) => reject(err),
      ...opts,
    })
  })

export const toCsv = (rows) => Papa.unparse(rows)

export function normalizeDimension(v) {
  const s = String(v ?? '').trim()
  if (!s) return null
  const cleaned = s.replace(/[*_]/g, '').toLowerCase()
  return DIM_NAME_MAP[cleaned] ?? DIMENSIONS[cleaned[0]?.toUpperCase()] ?? s
}

export function normalizeDimensions(v) {
  if (!v) return []
  if (Array.isArray(v)) {
    return v.flatMap((x) => normalizeDimensions(x)).filter(Boolean)
  }
  const s = String(v).trim()
  if (!s) return []
  const parts = s.split(/[,/|;]+/).map((p) => p.trim()).filter(Boolean)
  const normalized = []
  for (const part of parts) {
    const dim = normalizeDimension(part)
    if (dim && !normalized.includes(dim)) {
      normalized.push(dim)
    }
  }
  return normalized
}

const orderIndex = (list, v) => {
  const i = list.indexOf(String(v).toLowerCase())
  return i === -1 ? list.length : i
}

export function orderDimensions(dims) {
  return sortBy(dims, (d) => orderIndex(DIM_ORDER.map((x) => x.toLowerCase()), d), (d) => d)
}

export function orderDifficulties(diffs) {
  return sortBy(diffs, (d) => orderIndex(TIER_ORDER, d), (d) => Number(d) || 0, (d) => d)
}

export function parseExpectedSolveRate(rawVal) {
  if (rawVal === undefined || rawVal === null) return null
  const s = String(rawVal).replace(/%/g, '').trim()
  if (!s) return null
  const num = Number(s)
  if (!Number.isFinite(num)) return null
  if (num > 0 && num <= 1.0) {
    return round(num * 100, 2)
  }
  return round(num, 2)
}

export function readExamConfig(rowsInput) {
  const rows = Array.isArray(rowsInput) ? rowsInput : (rowsInput?.data || [])
  const warnings = []
  const questions = []

  for (const r of rows) {
    if (!r || typeof r !== 'object') continue
    const x = {}
    for (const [k, v] of Object.entries(r)) {
      x[norm(k)] = v
    }

    const id = String(x.question_id ?? x.id ?? x.qid ?? '').trim()
    if (!id) {
      warnings.push(`Question row missing ID: ${JSON.stringify(r)}`)
      continue
    }

    const rawMarks = x.marks ?? x.total_marks ?? x.max_marks ?? x.points
    const marks = Number(rawMarks)
    if (!Number.isFinite(marks) || marks <= 0) {
      warnings.push(`Question ${id}: marks "${rawMarks}" is invalid or <= 0`)
      continue
    }

    const rawType = String(x.question_type ?? x.type ?? x.qtype ?? '').trim()
    const type = rawType || 'MCQ'

    const rawDiff = String(x.question_difficulty ?? x.difficulty ?? x.diff ?? x.tier ?? '').trim().toLowerCase()
    const difficulty = TIER_ORDER.includes(rawDiff) ? rawDiff : (rawDiff || 'medium')

    const rawDim = x.question_dimension ?? x.dimension ?? x.dimensions ?? x.question_dimensions ?? ''
    const dims = normalizeDimensions(rawDim)
    if (!dims.length) {
      warnings.push(`Question ${id}: no valid dimension specified, defaulted to Recall`)
      dims.push('Recall')
    }

    const rawTopics = String(x.question_topics ?? x.topics ?? x.topic ?? x.question_topic ?? '').trim()
    const topics = rawTopics
      ? rawTopics.split(/[,/|;]+/).map((t) => t.trim()).filter(Boolean)
      : ['General']

    const K = dims.length
    const dimensionMarks = {}
    for (const d of dims) {
      dimensionMarks[d] = marks / K
    }

    const candidateExpectedKeys = [
      'expected_solve_rate',
      'expected_rate',
      'expected_solve_pct',
      'solve_rate_expected',
      'expected_pct',
      'target_solve_rate',
      'expected_solve',
    ]
    let rawExpected = undefined
    for (const k of candidateExpectedKeys) {
      if (x[k] !== undefined && x[k] !== null && String(x[k]).trim() !== '') {
        rawExpected = x[k]
        break
      }
    }
    const expectedSolveRate = parseExpectedSolveRate(rawExpected)

    questions.push({
      id,
      type,
      difficulty,
      dimensions: dims,
      dimension: dims.join(', '),
      dimensionMarks,
      topics,
      topic: topics.join(', '),
      marks,
      expectedSolveRate,
      expectedRate: expectedSolveRate,
    })
  }

  const summary = {
    totalQuestions: questions.length,
    totalMarks: round(sumBy(questions, 'marks'), 2),
    dimensions: orderDimensions([...new Set(questions.flatMap((q) => q.dimensions))]),
    difficulties: orderDifficulties([...new Set(questions.map((q) => q.difficulty))]),
    topics: [...new Set(questions.flatMap((q) => q.topics))].sort(),
  }

  return { questions, warnings, summary }
}

export const readQuestions = readExamConfig

export function readStudentScores(rowsInput, questions = []) {
  const rows = Array.isArray(rowsInput) ? rowsInput : (rowsInput?.data || [])
  const warnings = []
  const scores = {}
  const attempts = {}
  const byId = keyBy(questions, (q) => key(q.id))

  if (!rows.length) {
    return { scores, attempts, warnings }
  }

  const firstRow = rows[0]
  const fields = Object.keys(firstRow)

  const studentField = fields.find((f) =>
    ['student_id', 'id', 'student', 'student_name', 'name', 'sid'].includes(norm(f))
  ) ?? fields[0]

  const qidField = fields.find((f) =>
    ['question_id', 'qid', 'question'].includes(norm(f))
  )

  const marksField = fields.find((f) =>
    ['marks_gained', 'marks', 'score', 'points', 'mark'].includes(norm(f))
  )

  const isLongFormat = Boolean(qidField && marksField)
  const unattemptedTokens = new Set(['', 'null', 'undefined', '-', 'na', 'n/a', 'unattempted', 'none'])

  if (isLongFormat) {
    for (const r of rows) {
      const studentId = String(r[studentField] ?? '').trim()
      if (!studentId) continue

      const qidRaw = String(r[qidField] ?? '').trim()
      if (!qidRaw) continue

      const q = byId[key(qidRaw)]
      if (!q) {
        warnings.push(`Question ID "${qidRaw}" not found in exam config for student ${studentId}`)
        continue
      }

      const valRaw = r[marksField]
      const strVal = String(valRaw ?? '').trim().toLowerCase()
      if (unattemptedTokens.has(strVal)) {
        continue
      }

      const m = Number(valRaw)
      if (!Number.isFinite(m)) {
        warnings.push(`${studentId} / ${q.id}: "${valRaw}" is not a valid number, counted as 0`)
        scores[studentId] ??= {}
        scores[studentId][q.id] = 0
        continue
      }

      if (m < 0) {
        warnings.push(`${studentId} / ${q.id}: negative score ${m} clamped to 0`)
        scores[studentId] ??= {}
        scores[studentId][q.id] = 0
        continue
      }

      if (m > q.marks) {
        warnings.push(`${studentId} / ${q.id}: score ${m} exceeds max marks ${q.marks}`)
      }

      scores[studentId] ??= {}
      scores[studentId][q.id] = m
      attempts[studentId] ??= {}
      attempts[studentId][q.id] = true
    }
  } else {
    // Wide format: non-student columns represent questions
    const questionCols = fields.filter((f) => f !== studentField)
    for (const r of rows) {
      const studentId = String(r[studentField] ?? '').trim()
      if (!studentId) continue

      for (const col of questionCols) {
        const q = byId[key(col)]
        if (!q) continue

        const valRaw = r[col]
        const strVal = String(valRaw ?? '').trim().toLowerCase()
        if (unattemptedTokens.has(strVal)) {
          continue
        }

        const m = Number(valRaw)
        if (!Number.isFinite(m)) {
          warnings.push(`${studentId} / ${q.id}: "${valRaw}" is not a valid number, counted as 0`)
          scores[studentId] ??= {}
          scores[studentId][q.id] = 0
          attempts[studentId] ??= {}
          attempts[studentId][q.id] = true
          continue
        }

        if (m < 0) {
          warnings.push(`${studentId} / ${q.id}: negative score ${m} clamped to 0`)
          scores[studentId] ??= {}
          scores[studentId][q.id] = 0
          attempts[studentId] ??= {}
          attempts[studentId][q.id] = true
          continue
        }

        if (m > q.marks) {
          warnings.push(`${studentId} / ${q.id}: score ${m} exceeds max marks ${q.marks}`)
        }

        scores[studentId] ??= {}
        scores[studentId][q.id] = m
        attempts[studentId] ??= {}
        attempts[studentId][q.id] = true
      }
    }
  }

  return { scores, attempts, warnings }
}

export const readScores = (rows, fieldsOrQuestions, maybeQuestions) => {
  const questions = Array.isArray(fieldsOrQuestions) && fieldsOrQuestions[0]?.marks !== undefined
    ? fieldsOrQuestions
    : maybeQuestions || []
  return readStudentScores(rows, questions)
}

export function readStudentInfo(rowsInput) {
  const rows = Array.isArray(rowsInput) ? rowsInput : (rowsInput?.data || [])
  const warnings = []
  const students = {}

  for (const r of rows) {
    if (!r || typeof r !== 'object') continue
    const x = {}
    for (const [k, v] of Object.entries(r)) {
      x[norm(k)] = v
    }

    const id = String(x.student_id ?? x.id ?? x.student ?? x.sid ?? '').trim()
    const name = String(x.student_name ?? x.name ?? x.full_name ?? id).trim()

    if (!id) {
      warnings.push(`Student row missing ID: ${JSON.stringify(r)}`)
      continue
    }

    students[id] = { id, name: name || id }
  }

  return { students, warnings }
}

export const readStudentDetails = readStudentInfo

export const DEFAULT_WEAK_THRESHOLD = 50
export const DEFAULT_THRESHOLDS = {
  weakAbs: 50,
  strongAbs: 80,
  cohortMargin: 15,
  weakThreshold: 50,
  strongThreshold: 80,
  classDelta: 15,
  weakPct: 50,
  strongPct: 80,
  deltaPct: 15,
}

export function classifyDimension(studentPct, cohortPct, thresholds = {}) {
  if (studentPct === null || studentPct === undefined || isNaN(Number(studentPct))) return 'average'
  const s = Number(studentPct)
  const weakThresh = thresholds.weakAbs ?? thresholds.weakThreshold ?? thresholds.weakPct ?? DEFAULT_THRESHOLDS.weakAbs
  const strongThresh = thresholds.strongAbs ?? thresholds.strongThreshold ?? thresholds.strongPct ?? DEFAULT_THRESHOLDS.strongAbs
  const delta = thresholds.cohortMargin ?? thresholds.classDelta ?? thresholds.deltaPct ?? DEFAULT_THRESHOLDS.cohortMargin

  if (cohortPct === null || cohortPct === undefined || isNaN(Number(cohortPct))) {
    if (s < weakThresh) return 'weak'
    if (s >= strongThresh) return 'strong'
    return 'average'
  }

  const c = Number(cohortPct)
  if (s < weakThresh && s < c - delta) {
    return 'weak'
  }
  if (s >= strongThresh && s > c + delta) {
    return 'strong'
  }
  return 'average'
}

export function getWeakDimensions(dimensions, threshold = DEFAULT_WEAK_THRESHOLD) {
  const weak = []
  for (const [d, info] of Object.entries(dimensions || {})) {
    const pct = typeof info === 'number' ? info : (info?.masteryPct ?? info?.pct)
    if (pct !== null && pct !== undefined && !isNaN(Number(pct)) && Number(pct) < threshold) {
      weak.push(d)
    }
  }
  return weak
}

export function getWeakestDimension(dimensions, threshold = DEFAULT_WEAK_THRESHOLD) {
  const weak = getWeakDimensions(dimensions, threshold)
  if (!weak.length) return null
  return minBy(weak, (d) => {
    const info = dimensions[d]
    return typeof info === 'number' ? info : (info?.masteryPct ?? info?.pct ?? 0)
  })
}

export function getStudentDimensionStatuses(studentDimensions, cohortDimensions, thresholds = {}) {
  const result = {}
  for (const [dim, sData] of Object.entries(studentDimensions || {})) {
    const sPct = typeof sData === 'number' ? sData : (sData?.masteryPct ?? sData?.pct ?? null)
    const cData = cohortDimensions?.[dim]
    const cPct = typeof cData === 'number' ? cData : (cData?.masteryPct ?? cData?.pct ?? null)
    result[dim] = classifyDimension(sPct, cPct, thresholds)
  }
  return result
}

export function getDifficultyVerdict(meanPct) {
  const pct = Number(meanPct) || 0
  let verdict, verdictTone
  if (pct < 40) {
    verdict = 'Very Difficult'
    verdictTone = 'danger'
  } else if (pct < 55) {
    verdict = 'Difficult'
    verdictTone = 'warning'
  } else if (pct < 70) {
    verdict = 'Balanced'
    verdictTone = 'neutral'
  } else if (pct < 85) {
    verdict = 'Easy'
    verdictTone = 'success'
  } else {
    verdict = 'Very Easy'
    verdictTone = 'info'
  }
  return { verdict, verdictTone, tone: verdictTone }
}

export function computeDistributionStats(values) {
  const nums = (values || [])
    .map((v) => (typeof v === 'number' ? v : Number(v)))
    .filter((v) => Number.isFinite(v))

  if (!nums.length) {
    return { count: 0, mean: 0, median: 0, min: 0, max: 0, stdDev: 0 }
  }

  const count = nums.length
  const sum = nums.reduce((acc, v) => acc + v, 0)
  const mean = round(sum / count, 2)

  const sorted = [...nums].sort((a, b) => a - b)
  const min = round(sorted[0], 2)
  const max = round(sorted[sorted.length - 1], 2)

  let median
  const mid = Math.floor(count / 2)
  if (count % 2 === 1) {
    median = round(sorted[mid], 2)
  } else {
    median = round((sorted[mid - 1] + sorted[mid]) / 2, 2)
  }

  const variance = nums.reduce((acc, v) => acc + (v - mean) ** 2, 0) / count
  const stdDev = round(Math.sqrt(variance), 2)

  return { count, mean, median, min, max, stdDev }
}

export function computeDecileBins(items = [], totalMarks = 100) {
  const safeTotalMarks = Number(totalMarks) > 0 ? Number(totalMarks) : 100
  const bins = []
  for (let i = 0; i < 10; i++) {
    const minPct = i * 10
    const maxPct = (i + 1) * 10
    const label = `${minPct}-${maxPct}%`
    const minMarks = round((minPct / 100) * safeTotalMarks, 2)
    const maxMarks = round((maxPct / 100) * safeTotalMarks, 2)
    bins.push({
      binIndex: i,
      label,
      minPct,
      maxPct,
      minMarks,
      maxMarks,
      count: 0,
      percentage: 0,
      studentIds: [],
    })
  }

  const validItems = items || []
  let totalCount = 0

  for (let idx = 0; idx < validItems.length; idx++) {
    const item = validItems[idx]
    let pctVal = null
    let studentId = null

    if (typeof item === 'number') {
      pctVal = item
      studentId = String(idx + 1)
    } else if (item && typeof item === 'object') {
      studentId = item.id != null ? String(item.id) : (item.studentId != null ? String(item.studentId) : String(idx + 1))
      if (item.pct !== undefined && item.pct !== null) {
        pctVal = Number(item.pct)
      } else if (item.masteryPct !== undefined && item.masteryPct !== null) {
        pctVal = Number(item.masteryPct)
      } else if (item.score !== undefined && item.score !== null) {
        pctVal = safeTotalMarks > 0 ? (Number(item.score) / safeTotalMarks) * 100 : Number(item.score)
      } else if (item.earned !== undefined && item.earned !== null) {
        pctVal = safeTotalMarks > 0 ? (Number(item.earned) / safeTotalMarks) * 100 : Number(item.earned)
      }
    }

    if (pctVal === null || !Number.isFinite(pctVal)) {
      continue
    }

    const clampedPct = Math.max(0, Math.min(100, pctVal))
    totalCount++

    let binIdx
    if (clampedPct <= 10) {
      binIdx = 0
    } else {
      binIdx = Math.min(9, Math.ceil(clampedPct / 10) - 1)
    }

    bins[binIdx].count++
    if (studentId) {
      bins[binIdx].studentIds.push(studentId)
    }
  }

  for (const bin of bins) {
    bin.percentage = totalCount > 0 ? round((bin.count / totalCount) * 100, 1) : 0
  }

  return bins
}

export function computeRawMarkBins(items = [], totalMarks = 100, options = {}) {
  const marksLimit = Number(totalMarks) >= 0 ? Number(totalMarks) : 100
  if (marksLimit <= 0) {
    const studentIds = (items || []).map((it, idx) => (it && typeof it === 'object' && it.id != null ? String(it.id) : String(idx + 1)))
    return [
      {
        binIndex: 0,
        label: '0-0',
        minMarks: 0,
        maxMarks: 0,
        count: studentIds.length,
        percentage: studentIds.length ? 100 : 0,
        studentIds,
      },
    ]
  }

  const step = options.step ?? (options.bins === 10 || options.binCount === 10 ? round(marksLimit / 10, 2) : (marksLimit <= 25 ? 5 : 10))
  const binCount = Math.max(1, Math.ceil(marksLimit / step))
  const bins = []

  for (let i = 0; i < binCount; i++) {
    const minMarks = round(i * step, 2)
    const maxMarks = round(Math.min((i + 1) * step, marksLimit), 2)
    const label = `${minMarks}-${maxMarks}`
    bins.push({
      binIndex: i,
      label,
      minMarks,
      maxMarks,
      count: 0,
      percentage: 0,
      studentIds: [],
    })
  }

  const validItems = items || []
  let totalCount = 0

  for (let idx = 0; idx < validItems.length; idx++) {
    const item = validItems[idx]
    let markVal = null
    let studentId = null

    if (typeof item === 'number') {
      markVal = item
      studentId = String(idx + 1)
    } else if (item && typeof item === 'object') {
      studentId = item.id != null ? String(item.id) : (item.studentId != null ? String(item.studentId) : String(idx + 1))
      if (item.earned !== undefined && item.earned !== null) {
        markVal = Number(item.earned)
      } else if (item.score !== undefined && item.score !== null) {
        markVal = Number(item.score)
      } else if (item.marks !== undefined && item.marks !== null) {
        markVal = Number(item.marks)
      } else if (item.pct !== undefined && item.pct !== null) {
        markVal = (Number(item.pct) / 100) * marksLimit
      } else if (item.masteryPct !== undefined && item.masteryPct !== null) {
        markVal = (Number(item.masteryPct) / 100) * marksLimit
      }
    }

    if (markVal === null || !Number.isFinite(markVal)) {
      continue
    }

    const clampedMark = Math.max(0, Math.min(marksLimit, markVal))
    totalCount++

    let binIdx
    if (clampedMark <= bins[0].maxMarks) {
      binIdx = 0
    } else {
      binIdx = Math.min(binCount - 1, Math.ceil(clampedMark / step) - 1)
    }

    bins[binIdx].count++
    if (studentId) {
      bins[binIdx].studentIds.push(studentId)
    }
  }

  for (const bin of bins) {
    bin.percentage = totalCount > 0 ? round((bin.count / totalCount) * 100, 1) : 0
  }

  return bins
}

export const DEFAULT_EXPECTED_SOLVE_RATES = {
  beginner: 85,
  easy: 75,
  medium: 55,
  hard: 35,
  challenge: 20,
}

export function getDefaultExpectedRate(difficulty) {
  const d = String(difficulty ?? '').trim().toLowerCase()
  return DEFAULT_EXPECTED_SOLVE_RATES[d] ?? 55
}

export function computeQuestionSolveRates(questions = [], scores = {}, students = [], totalExam = null) {
  const studentList = Array.isArray(students) && students.length > 0
    ? students.map((s) => (typeof s === 'object' && s !== null ? s.id : String(s)))
    : Object.keys(scores || {})
  const totalStudents = studentList.length

  const questionAnalyses = questions.map((q) => {
    let attemptedCount = 0
    let solvedCount = 0
    let totalEarned = 0

    for (const sid of studentList) {
      const studentScores = scores[sid] || {}
      const rawScore = studentScores[q.id] ?? studentScores[q.id?.toLowerCase()] ?? studentScores[q.id?.toUpperCase()]
      const isAttempted =
        rawScore !== undefined &&
        rawScore !== null &&
        rawScore !== '' &&
        !isNaN(Number(rawScore))

      if (isAttempted) {
        attemptedCount++
        const score = Number(rawScore)
        totalEarned += score
        if (score >= q.marks - 0.001) {
          solvedCount++
        }
      }
    }

    totalEarned = round(totalEarned, 2)
    const actualSolveRate = round((solvedCount / Math.max(1, totalStudents)) * 100, 1)
    const attemptedSolveRate = attemptedCount > 0 ? round((solvedCount / attemptedCount) * 100, 1) : null
    const meanEarned = round(totalEarned / Math.max(1, totalStudents), 2)
    const meanScorePct = q.marks > 0 ? round((meanEarned / q.marks) * 100, 1) : 0

    const rawExp = q.expectedSolveRate !== null && q.expectedSolveRate !== undefined
      ? q.expectedSolveRate
      : (q.expectedRate !== null && q.expectedRate !== undefined ? q.expectedRate : null)
    const hasExplicitExpectedRate = rawExp !== null
    const expectedSolveRate = hasExplicitExpectedRate ? rawExp : getDefaultExpectedRate(q.difficulty)

    const deviation = round(actualSolveRate - expectedSolveRate, 1)
    const scoreDeviation = round(meanScorePct - expectedSolveRate, 1)

    let alignment = 'on-target'
    let alignmentLabel = 'On Target'
    if (deviation > 15) {
      alignment = 'much-easier'
      alignmentLabel = 'Much Easier Than Expected'
    } else if (deviation < -15) {
      alignment = 'much-harder'
      alignmentLabel = 'Much Harder Than Expected'
    }

    const isHighDeviation = Math.abs(deviation) >= 20

    return {
      id: q.id,
      type: q.type || 'MCQ',
      dimensions: q.dimensions || [],
      difficulty: q.difficulty || 'medium',
      topic: q.topic || (Array.isArray(q.topics) ? q.topics.join(', ') : 'General'),
      marks: q.marks,
      attemptedCount,
      solvedCount,
      totalStudents,
      actualSolveRate,
      attemptedSolveRate,
      totalEarned,
      meanEarned,
      meanScorePct,
      expectedSolveRate,
      hasExplicitExpectedRate,
      deviation,
      scoreDeviation,
      alignment,
      alignmentLabel,
      isHighDeviation,
    }
  })

  const totalQuestions = questionAnalyses.length
  const alignedCount = questionAnalyses.filter((q) => q.alignment === 'on-target').length
  const muchHarderCount = questionAnalyses.filter((q) => q.alignment === 'much-harder').length
  const muchEasierCount = questionAnalyses.filter((q) => q.alignment === 'much-easier').length
  const alignmentRate = totalQuestions > 0 ? round((alignedCount / totalQuestions) * 100, 1) : 0
  const avgAbsDeviation = totalQuestions > 0 ? round(sumBy(questionAnalyses, (q) => Math.abs(q.deviation)) / totalQuestions, 1) : 0
  const maxHarderSurprise = totalQuestions > 0 ? minBy(questionAnalyses, (q) => q.deviation) : null
  const maxEasierSurprise = totalQuestions > 0 ? maxBy(questionAnalyses, (q) => q.deviation) : null
  const highDeviationAlerts = questionAnalyses.filter((q) => q.isHighDeviation)

  return {
    questions: questionAnalyses,
    totalQuestions,
    alignedCount,
    muchHarderCount,
    muchEasierCount,
    alignmentRate,
    avgAbsDeviation,
    maxHarderSurprise,
    maxEasierSurprise,
    highDeviationAlerts,
  }
}

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

export function computePaperAnalysis(questions = [], scores = {}, students = [], cohort = null, options = {}) {
  // If called directly with (questions, scores, studentInfo, options)
  if (!Array.isArray(students) || !cohort) {
    const studentInfo = (students && typeof students === 'object' && !Array.isArray(students)) ? students : {}
    const opts = (cohort && typeof cohort === 'object' && !cohort.id) ? cohort : (options || {})
    const profiles = buildProfiles(questions, scores, studentInfo, opts)
    return profiles.paperAnalysis
  }

  const totalExam = round(sumBy(questions, 'marks'), 2)
  const allExamDims = orderDimensions([...new Set([...DIM_ORDER, ...questions.flatMap((q) => q.dimensions)])])
  const allExamDiffs = orderDifficulties([...new Set([...TIER_ORDER, ...questions.map((q) => q.difficulty)])])
  const studentCount = students.length

  // 1. Dimension Paper Analysis
  const dimensionAnalysis = {}
  for (const d of allExamDims) {
    const matchingQuestions = questions.filter((q) => q.dimensions.includes(d))
    const questionCount = matchingQuestions.length
    const availableMarks = round(
      sumBy(matchingQuestions, (q) => q.dimensionMarks?.[d] ?? (q.marks / (q.dimensions.length || 1))),
      2
    )

    const studentPcts = students.map((s) => ({
      id: s.id,
      pct: s.dimensions?.[d]?.masteryPct ?? 0,
      earned: s.dimensions?.[d]?.earned ?? 0,
    }))
    const masteryValues = studentPcts.map((s) => s.pct)
    const earnedValues = studentPcts.map((s) => s.earned)

    const stats = computeDistributionStats(masteryValues)
    const meanEarned = studentCount > 0 ? round(sumBy(earnedValues, (v) => v) / studentCount, 2) : 0
    const verdictInfo = getDifficultyVerdict(stats.mean)

    const decileBins = computeDecileBins(studentPcts, availableMarks)
    const rawMarkBins = computeRawMarkBins(studentPcts, availableMarks)

    dimensionAnalysis[d] = {
      dimension: d,
      availableMarks,
      questionCount,
      meanPct: stats.mean,
      meanEarned,
      medianPct: stats.median,
      minPct: stats.min,
      maxPct: stats.max,
      stdDevPct: stats.stdDev,
      verdict: verdictInfo.verdict,
      verdictTone: verdictInfo.verdictTone,
      decileBins,
      rawMarkBins,
    }
  }

  // 2. Difficulty Level Spread Evaluation
  const difficultyAnalysis = {}
  for (const diff of allExamDiffs) {
    const matchingQuestions = questions.filter((q) => q.difficulty === diff)
    const questionCount = matchingQuestions.length
    const availableMarks = round(sumBy(matchingQuestions, 'marks'), 2)

    const studentPcts = students.map((s) => ({
      id: s.id,
      pct: s.difficulties?.[diff]?.masteryPct ?? 0,
      earned: s.difficulties?.[diff]?.earned ?? 0,
    }))
    const masteryValues = studentPcts.map((s) => s.pct)
    const earnedValues = studentPcts.map((s) => s.earned)

    const stats = computeDistributionStats(masteryValues)
    const meanEarned = studentCount > 0 ? round(sumBy(earnedValues, (v) => v) / studentCount, 2) : 0
    const verdictInfo = getDifficultyVerdict(stats.mean)

    const decileBins = computeDecileBins(studentPcts, availableMarks)
    const rawMarkBins = computeRawMarkBins(studentPcts, availableMarks)

    difficultyAnalysis[diff] = {
      difficulty: diff,
      availableMarks,
      questionCount,
      meanPct: stats.mean,
      meanEarned,
      medianPct: stats.median,
      minPct: stats.min,
      maxPct: stats.max,
      stdDevPct: stats.stdDev,
      verdict: verdictInfo.verdict,
      verdictTone: verdictInfo.verdictTone,
      decileBins,
      rawMarkBins,
    }
  }

  // Progression: ordered by beginner -> challenge
  const activeProgression = TIER_ORDER
    .filter((tier) => difficultyAnalysis[tier] && difficultyAnalysis[tier].availableMarks > 0)
    .map((tier) => difficultyAnalysis[tier])
  const progression = activeProgression.length
    ? activeProgression
    : TIER_ORDER.map((tier) => difficultyAnalysis[tier] || { difficulty: tier, availableMarks: 0, questionCount: 0, meanPct: 0 })

  // Anomaly detection: check if harder tier has higher mastery than an easier tier
  const anomalies = []
  for (let i = 0; i < progression.length - 1; i++) {
    const easier = progression[i]
    const harder = progression[i + 1]
    if (easier.availableMarks > 0 && harder.availableMarks > 0 && easier.meanPct < harder.meanPct) {
      anomalies.push(`${capitalize(easier.difficulty)} mastery (${easier.meanPct}%) is lower than ${capitalize(harder.difficulty)} (${harder.meanPct}%)`)
    }
  }

  difficultyAnalysis.progression = progression
  difficultyAnalysis.anomalies = anomalies

  // 3. Dimension x Difficulty Cross Matrix
  const matrixCells = {}
  const rowTotals = {}
  const colTotals = {}

  const matrixDims = orderDimensions([...new Set([...DIM_ORDER, ...questions.flatMap((q) => q.dimensions)])])
  const matrixDiffs = orderDifficulties([...new Set([...TIER_ORDER, ...questions.map((q) => q.difficulty)])])

  for (const d of matrixDims) {
    matrixCells[d] = {}
  }

  for (const diff of matrixDiffs) {
    const matchingByDiff = questions.filter((q) => q.difficulty === diff)
    const diffAvailable = round(sumBy(matchingByDiff, 'marks'), 2)
    const diffEarnedTotal = sumBy(students, (s) => s.difficulties?.[diff]?.earned ?? 0)
    const diffCohortEarnedAvg = studentCount > 0 ? round(diffEarnedTotal / studentCount, 2) : 0
    colTotals[diff] = {
      difficulty: diff,
      questionCount: matchingByDiff.length,
      questionIds: matchingByDiff.map((q) => q.id),
      availableMarks: diffAvailable,
      cohortEarnedAvg: diffCohortEarnedAvg,
      cohortMasteryPct: diffAvailable > 0 ? round((diffCohortEarnedAvg / diffAvailable) * 100, 1) : 0,
    }
  }

  for (const d of matrixDims) {
    const matchingByDim = questions.filter((q) => q.dimensions.includes(d))
    let dimAvailable = 0
    let dimEarnedTotal = 0

    for (const diff of matrixDiffs) {
      const cellQuestions = questions.filter((q) => q.difficulty === diff && q.dimensions.includes(d))
      const cellQuestionCount = cellQuestions.length
      const cellQuestionIds = cellQuestions.map((q) => q.id)
      const cellAvailable = round(
        sumBy(cellQuestions, (q) => q.dimensionMarks?.[d] ?? (q.marks / (q.dimensions.length || 1))),
        2
      )

      let cellEarnedSum = 0
      for (const s of students) {
        const studentScores = scores[s.id] || {}
        let sCellEarned = 0
        for (const q of cellQuestions) {
          if (q.id in studentScores && studentScores[q.id] !== null && studentScores[q.id] !== undefined) {
            const rawScore = Number(studentScores[q.id])
            if (Number.isFinite(rawScore) && rawScore > 0) {
              const K = q.dimensions.length || 1
              sCellEarned += rawScore / K
            }
          }
        }
        cellEarnedSum += sCellEarned
      }

      const cohortEarnedAvg = studentCount > 0 ? round(cellEarnedSum / studentCount, 2) : 0
      const cohortMasteryPct = cellAvailable > 0 ? round((cohortEarnedAvg / cellAvailable) * 100, 1) : 0

      matrixCells[d][diff] = {
        dimension: d,
        difficulty: diff,
        questionCount: cellQuestionCount,
        questionIds: cellQuestionIds,
        availableMarks: cellAvailable,
        cohortEarnedAvg,
        cohortMasteryPct,
      }

      dimAvailable += cellAvailable
      dimEarnedTotal += cellEarnedSum
    }

    dimAvailable = round(dimAvailable, 2)
    const dimCohortEarnedAvg = studentCount > 0 ? round(dimEarnedTotal / studentCount, 2) : 0
    rowTotals[d] = {
      dimension: d,
      questionCount: matchingByDim.length,
      questionIds: matchingByDim.map((q) => q.id),
      availableMarks: dimAvailable,
      cohortEarnedAvg: dimCohortEarnedAvg,
      cohortMasteryPct: dimAvailable > 0 ? round((dimCohortEarnedAvg / dimAvailable) * 100, 1) : 0,
    }
  }

  const grandCohortEarnedAvg = studentCount > 0 ? round(sumBy(students, 'earned') / studentCount, 2) : 0
  const grandTotal = {
    questionCount: questions.length,
    availableMarks: totalExam,
    cohortEarnedAvg: grandCohortEarnedAvg,
    cohortMasteryPct: totalExam > 0 ? round((grandCohortEarnedAvg / totalExam) * 100, 1) : 0,
  }

  const crossMatrix = {
    cells: matrixCells,
    matrix: matrixCells,
    dimensions: orderDimensions([...new Set(questions.flatMap((q) => q.dimensions))]),
    difficulties: orderDifficulties([...new Set(questions.map((q) => q.difficulty))]),
    allDimensions: matrixDims,
    allDifficulties: matrixDiffs,
    rowTotals,
    colTotals,
    grandTotal,
    rows: matrixDims.map((d) => ({
      dimension: d,
      cells: matrixCells[d],
      total: rowTotals[d],
    })),
  }

  // 4. Paper Diagnostic Summary
  const activeDimsList = allExamDims
    .filter((d) => dimensionAnalysis[d] && dimensionAnalysis[d].availableMarks > 0)
    .map((d) => dimensionAnalysis[d])

  const hardestDimensionObj = activeDimsList.length ? minBy(activeDimsList, (d) => d.meanPct) : null
  const easiestDimensionObj = activeDimsList.length ? maxBy(activeDimsList, (d) => d.meanPct) : null

  const hardestDimension = hardestDimensionObj ? hardestDimensionObj.dimension : null
  const easiestDimension = easiestDimensionObj ? easiestDimensionObj.dimension : null

  const activeDiffsList = allExamDiffs
    .filter((diff) => difficultyAnalysis[diff] && difficultyAnalysis[diff].availableMarks > 0)
    .map((diff) => difficultyAnalysis[diff])

  const hardestDiffObj = activeDiffsList.length ? minBy(activeDiffsList, (diff) => diff.meanPct) : null
  const easiestDiffObj = activeDiffsList.length ? maxBy(activeDiffsList, (diff) => diff.meanPct) : null

  const hardestDifficulty = hardestDiffObj ? hardestDiffObj.difficulty : null
  const easiestDifficulty = easiestDiffObj ? easiestDiffObj.difficulty : null

  const insights = []
  if (hardestDimensionObj) {
    insights.push(`Paper was most challenging on ${hardestDimensionObj.dimension} (${hardestDimensionObj.meanPct}% mastery)`)
  }
  if (easiestDimensionObj && easiestDimensionObj.dimension !== hardestDimensionObj?.dimension) {
    if (easiestDimensionObj.meanPct >= 70) {
      insights.push(`${easiestDimensionObj.dimension} was very accessible (${easiestDimensionObj.meanPct}% mastery)`)
    } else {
      insights.push(`${easiestDimensionObj.dimension} was the strongest dimension (${easiestDimensionObj.meanPct}% mastery)`)
    }
  }
  for (const anomaly of anomalies) {
    insights.push(`Difficulty anomaly detected: ${anomaly}`)
  }
  if (cohort) {
    insights.push(`Overall cohort mastery was ${cohort.masteryPct}% with an average score of ${cohort.earned}/${cohort.totalExam} marks`)
  }
  if (easiestDiffObj && hardestDiffObj && easiestDiffObj.difficulty !== hardestDiffObj.difficulty) {
    insights.push(`Difficulty spread ranged from ${easiestDiffObj.difficulty} (${easiestDiffObj.meanPct}% mastery) to ${hardestDiffObj.difficulty} (${hardestDiffObj.meanPct}% mastery)`)
  }

  // 5. Overall Frequency Distributions
  const overallStudentPcts = students.map((s) => ({
    id: s.id,
    pct: s.masteryPct ?? 0,
    earned: s.earned ?? 0,
  }))
  const overallDecileBins = computeDecileBins(overallStudentPcts, totalExam)
  const overallRawMarkBins = computeRawMarkBins(overallStudentPcts, totalExam, { bins: 10 })
  const stats = computeDistributionStats(overallStudentPcts.map((s) => s.pct))
  const rawStats = computeDistributionStats(overallStudentPcts.map((s) => s.earned))
  const meanEarnedMarks = studentCount > 0 ? round(sumBy(students, 'earned') / studentCount, 2) : 0
  const verdictInfo = getDifficultyVerdict(stats.mean)
  const verdictTone = verdictInfo.tone || verdictInfo.verdictTone

  const overallDistribution = {
    totalExamMarks: totalExam,
    totalStudents: students.length,
    meanPct: stats.mean,
    meanEarned: meanEarnedMarks,
    medianPct: stats.median,
    minPct: stats.min,
    maxPct: stats.max,
    stdDevPct: stats.stdDev,
    verdict: verdictInfo.verdict,
    verdictTone,
    tone: verdictTone,
    stats,
    rawStats,
    decileBins: overallDecileBins,
    rawMarkBins: overallRawMarkBins,
  }

  const questionSolveRates = computeQuestionSolveRates(questions, scores, students, totalExam)

  return {
    dimensions: dimensionAnalysis,
    dimensionsList: allExamDims.map((d) => dimensionAnalysis[d]),
    difficulties: difficultyAnalysis,
    progression,
    anomalies,
    difficultySpread: {
      tiers: difficultyAnalysis,
      progression,
      anomalies,
    },
    crossMatrix,
    hardestDimension,
    easiestDimension,
    hardestDifficulty,
    easiestDifficulty,
    insights,
    summary: {
      hardestDimension,
      easiestDimension,
      hardestDifficulty,
      easiestDifficulty,
      insights,
    },
    overallDistribution,
    decileBins: overallDecileBins,
    rawMarkBins: overallRawMarkBins,
    distributionStats: stats,
    rawStats,
    questionSolveRates,
    questionAnalysis: questionSolveRates,
    expectedSimulation: simulateExpectedCohort(
      questions,
      scores,
      students,
      cohort
        ? {
            meanPct: cohort.meanPct ?? cohort.masteryPct ?? 0,
            medianPct: cohort.medianPct ?? 0,
            dimensions: dimensionAnalysis,
            decileBins: overallDecileBins,
          }
        : null,
      options
    ),
  }
}

export function simulateExpectedCohort(questions = [], scores = {}, students = [], cohort = null, options = {}) {
  let _s = options.seed ?? 20261015
  function _rand() {
    _s |= 0; _s = _s + 0x6D2B79F5 | 0
    let z = Math.imul(_s ^ _s >>> 15, 1 | _s)
    z = z + Math.imul(z ^ z >>> 7, 61 | z) ^ z
    return ((z ^ z >>> 14) >>> 0) / 4294967296
  }
  function _normal(mu, sigma) {
    const u1 = Math.max(_rand(), 1e-10)
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * _rand())
    return mu + z * sigma
  }
  function _clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
  function _r2(v) { return Math.round(v * 100) / 100 }

  if (!questions || questions.length === 0) return null
  const totalExam = questions.reduce((s, q) => s + (q.marks || 0), 0)
  if (totalExam === 0) return null

  const cohortSize = options.cohortSize ?? Math.max((students || []).length, 1)
  const IRT_A = 1.4, C_MCQ = 0.20

  const pqs = questions.map(q => {
    const pq = _clamp((q.expectedSolveRate ?? 55) / 100, 0.05, 0.95)
    return { ...q, pq, b_q: -Math.log(pq / (1 - pq)) / IRT_A }
  })

  const synth = []
  for (let i = 0; i < cohortSize; i++) {
    const theta = _normal(0, 0.85)
    let totalEarned = 0
    const dimE = {}, qScores = {}
    for (const q of pqs) {
      const logit = Math.exp(-IRT_A * (theta - q.b_q))
      const p3pl = C_MCQ + (1 - C_MCQ) / (1 + logit)
      const isCoding = (q.type || '').toLowerCase() === 'coding'
      let earned = 0
      if (isCoding) {
        const pFull = _clamp(q.pq + theta * 0.15, 0, 1)
        if (_rand() < pFull) {
          earned = q.marks
        } else {
          const tcProb = Math.sqrt(pFull)
          let passed = 0
          for (let t = 0; t < 5; t++) if (_rand() < tcProb) passed++
          earned = _r2((passed / 5) * q.marks)
        }
      } else {
        earned = _rand() < p3pl ? q.marks : 0
      }
      qScores[q.id] = earned
      totalEarned += earned
      const dims = Array.isArray(q.dimensions) ? q.dimensions : [q.dimensions || 'Recall']
      const mPD = q.marks / dims.length, ePD = earned / dims.length
      for (const d of dims) {
        if (!dimE[d]) dimE[d] = { earned: 0, available: 0 }
        dimE[d].earned += ePD; dimE[d].available += mPD
      }
    }
    synth.push({ id: `syn_${i}`, theta: _r2(theta), scores: qScores, totalEarned: _r2(totalEarned), pct: _r2((totalEarned / totalExam) * 100), dimE })
  }

  const pcts = synth.map(s => s.pct).sort((a, b) => a - b)
  const meanPct = _r2(pcts.reduce((s, v) => s + v, 0) / cohortSize)
  const medianPct = cohortSize % 2 === 0
    ? _r2((pcts[cohortSize / 2 - 1] + pcts[cohortSize / 2]) / 2)
    : pcts[Math.floor(cohortSize / 2)]
  const stdDevPct = _r2(Math.sqrt(pcts.reduce((s, v) => s + (v - meanPct) ** 2, 0) / cohortSize))
  const verdict = meanPct >= 70 ? 'Strong' : meanPct >= 50 ? 'Balanced' : 'Struggling'
  const expectedCohort = { totalExam, meanPct, medianPct, minPct: pcts[0], maxPct: pcts[pcts.length - 1], stdDevPct, verdict, verdictTone: meanPct >= 70 ? 'positive' : meanPct >= 50 ? 'neutral' : 'negative', cohortSize }

  // Decile bins (descending: 90-100% first)
  const rawDecile = Array.from({ length: 10 }, (_, i) => ({
    binIndex: i, label: `${i * 10}-${(i + 1) * 10}%`, minPct: i * 10, maxPct: (i + 1) * 10, count: 0, percentage: 0
  }))
  for (const s of synth) rawDecile[Math.min(9, Math.floor(s.pct / 10))].count++
  for (const b of rawDecile) b.percentage = _r2((b.count / cohortSize) * 100)
  const expectedDecileBins = [...rawDecile].reverse()

  // Raw mark bins (descending)
  const mStep = Math.max(5, Math.floor(totalExam / 10))
  const nBins = Math.ceil(totalExam / mStep)
  const rawMark = Array.from({ length: nBins }, (_, i) => ({
    binIndex: i, label: `${i * mStep}-${Math.min((i + 1) * mStep, totalExam)}`,
    minMark: i * mStep, maxMark: Math.min((i + 1) * mStep, totalExam), count: 0, percentage: 0
  }))
  for (const s of synth) rawMark[Math.min(nBins - 1, Math.floor(s.totalEarned / mStep))].count++
  for (const b of rawMark) b.percentage = _r2((b.count / cohortSize) * 100)
  const expectedRawMarkBins = [...rawMark].reverse()

  // Dimension expected mastery
  const DIMS = ['Recall', 'Comprehend', 'Solve', 'Build', 'Evaluate']
  const dimAvail = {}, dimSum = {}
  for (const q of pqs) {
    const dims = Array.isArray(q.dimensions) ? q.dimensions : [q.dimensions || 'Recall']
    const mPD = q.marks / dims.length
    for (const d of dims) dimAvail[d] = (dimAvail[d] || 0) + mPD
  }
  for (const s of synth) {
    for (const [d, info] of Object.entries(s.dimE)) dimSum[d] = (dimSum[d] || 0) + info.earned
  }
  const expectedDimensions = {}
  for (const d of DIMS) {
    if (!dimAvail[d]) continue
    const avg = (dimSum[d] || 0) / cohortSize
    expectedDimensions[d] = { dimension: d, availableMarks: _r2(dimAvail[d]), expectedEarned: _r2(avg), expectedMasteryPct: _r2((avg / dimAvail[d]) * 100) }
  }

  // Dimension gaps vs actual cohort
  const dimensionGaps = {}
  if (cohort && cohort.dimensions) {
    for (const d of DIMS) {
      const exp = expectedDimensions[d]; if (!exp) continue
      const actDim = cohort.dimensions[d]
      const actualMasteryPct = actDim?.meanPct ?? actDim?.masteryPct ?? null
      const gap = actualMasteryPct !== null ? _r2(actualMasteryPct - exp.expectedMasteryPct) : null
      let status = 'aligned', statusLabel = 'On Target'
      if (gap !== null) {
        if (gap < -15) { status = 'critical-deficit'; statusLabel = 'Severe Cohort Deficit' }
        else if (gap < -5) { status = 'moderate-deficit'; statusLabel = 'Moderate Deficit' }
        else if (gap > 5) { status = 'exceeded'; statusLabel = 'Cohort Exceeded Expectations' }
      }
      dimensionGaps[d] = {
        dimension: d, availableMarks: exp.availableMarks,
        expectedMasteryPct: exp.expectedMasteryPct, actualMasteryPct, gap, status, statusLabel,
        recommendation: status === 'critical-deficit'
          ? `Course Blindspot: Reinforce ${d} fundamentals — student mastery was ${Math.abs(gap)}pp below expectations. Review instructional delivery and practice problems.`
          : status === 'moderate-deficit'
          ? `Moderate gap in ${d}. Consider targeted review sessions or supplementary materials.`
          : status === 'exceeded'
          ? `Students outperformed in ${d}. Consider increasing difficulty or enrichment activities.`
          : `${d} is well-aligned with instructor expectations.`
      }
    }
  }

  // Topic gaps
  const topicGaps = {}
  const tAvail = {}, tExpSum = {}, tActInfo = {}
  for (const q of pqs) {
    const t = q.topic || (Array.isArray(q.topics) ? q.topics[0] : null) || 'General'
    tAvail[t] = (tAvail[t] || 0) + q.marks
  }
  for (const s of synth) {
    for (const q of pqs) {
      const t = q.topic || (Array.isArray(q.topics) ? q.topics[0] : null) || 'General'
      tExpSum[t] = (tExpSum[t] || 0) + (s.scores[q.id] || 0)
    }
  }
  if (students && students.length > 0 && scores) {
    for (const q of pqs) {
      const t = q.topic || (Array.isArray(q.topics) ? q.topics[0] : null) || 'General'
      if (!tActInfo[t]) tActInfo[t] = { earned: 0, available: 0 }
      for (const st of students) {
        tActInfo[t].earned += Number(scores[st.id]?.[q.id] ?? 0) || 0
        tActInfo[t].available += q.marks
      }
    }
  }
  for (const [topic, avail] of Object.entries(tAvail)) {
    const expM = _r2(((tExpSum[topic] || 0) / cohortSize / avail) * 100)
    const ai = tActInfo[topic]
    const actM = ai && ai.available > 0 ? _r2((ai.earned / ai.available) * 100) : null
    const gap = actM !== null ? _r2(actM - expM) : null
    let status = 'aligned', statusLabel = 'On Target'
    if (gap !== null) {
      if (gap < -15) { status = 'critical-deficit'; statusLabel = 'Severe Deficit' }
      else if (gap < -5) { status = 'moderate-deficit'; statusLabel = 'Moderate Deficit' }
      else if (gap > 5) { status = 'exceeded'; statusLabel = 'Exceeded' }
    }
    topicGaps[topic] = { topic, availableMarks: avail, expectedMasteryPct: expM, actualMasteryPct: actM, gap, status, statusLabel }
  }

  // Comparison bins
  const comparisonBins = expectedDecileBins.map(eb => {
    const ab = cohort?.decileBins ? cohort.decileBins.find(b => b.label === eb.label) : null
    const aC = ab?.count ?? 0, aP = ab?.percentage ?? 0
    return { label: eb.label, minPct: eb.minPct, maxPct: eb.maxPct, expectedCount: eb.count, expectedPct: eb.percentage, actualCount: aC, actualPct: aP, deltaPct: _r2(aP - eb.percentage) }
  })

  const divergenceScore = _r2(comparisonBins.reduce((s, b) => s + Math.abs(b.deltaPct), 0) / 2)
  const overallGap = {
    meanGap: cohort?.meanPct != null ? _r2(cohort.meanPct - meanPct) : null,
    medianGap: cohort?.medianPct != null ? _r2(cohort.medianPct - medianPct) : null,
    divergenceScore
  }

  const insights = []
  if (overallGap.meanGap != null) {
    if (overallGap.meanGap < -5) insights.push(`The cohort underperformed vs. instructor expectations by ${Math.abs(overallGap.meanGap)}pp on average mean score — course content may be harder than anticipated.`)
    else if (overallGap.meanGap > 5) insights.push(`The cohort outperformed instructor expectations by ${overallGap.meanGap}pp on average — instructors may be underestimating student readiness.`)
    else insights.push(`Overall cohort performance was closely aligned with instructor expectations (${Math.abs(overallGap.meanGap)}pp gap).`)
  }
  for (const [d, g] of Object.entries(dimensionGaps)) {
    if (g.status === 'critical-deficit') insights.push(`Critical deficit in ${d}: cohort scored ${Math.abs(g.gap)}pp below expectations. Likely a course coverage or teaching gap.`)
    else if (g.status === 'exceeded') insights.push(`Students exceeded expectations in ${d} by ${g.gap}pp — content in this dimension may be too straightforward.`)
  }
  if (divergenceScore > 15) insights.push(`High distribution divergence detected (${divergenceScore}pp) — the shape of the score curve differed significantly from instructor expectations.`)

  return { expectedCohort, expectedDecileBins, expectedRawMarkBins, expectedDimensions, dimensionGaps, topicGaps, comparisonBins, overallGap, insights, syntheticStudents: synth.map(s => ({ id: s.id, theta: s.theta, pct: s.pct, totalEarned: s.totalEarned })) }
}

export function buildProfiles(questions, scores = {}, studentInfo = {}, options = {}) {
  const totalExam = round(sumBy(questions, 'marks'), 2)
  const dimensions = orderDimensions([...new Set(questions.flatMap((q) => q.dimensions || []))])
  const difficulties = orderDifficulties([...new Set(questions.map((q) => q.difficulty || 'medium'))])
  const topics = [...new Set(questions.flatMap((q) => q.topics || []))].sort()

  const weakThreshold = options.weakAbs ?? options.weakThreshold ?? options.weakPct ?? DEFAULT_THRESHOLDS.weakAbs
  const strongThreshold = options.strongAbs ?? options.strongThreshold ?? options.strongPct ?? DEFAULT_THRESHOLDS.strongAbs
  const classDelta = options.cohortMargin ?? options.classDelta ?? options.deltaPct ?? DEFAULT_THRESHOLDS.cohortMargin
  const thresholds = {
    weakAbs: weakThreshold,
    strongAbs: strongThreshold,
    cohortMargin: classDelta,
    weakThreshold,
    strongThreshold,
    classDelta,
    weakPct: weakThreshold,
    strongPct: strongThreshold,
    deltaPct: classDelta,
  }

  const allStudentIds = [...new Set([
    ...Object.keys(scores || {}),
    ...Object.keys(studentInfo || {}),
  ])]

  const pct = (earned, available) => (available > 0 ? round((earned / available) * 100, 1) : null)

  const buildStudentProfile = (studentId) => {
    const studentScores = scores[studentId] || {}
    const info = studentInfo[studentId] || {}
    const name = info.name || studentId

    let totalAttempted = 0
    let earned = 0

    const dimBreakdown = {}
    for (const d of dimensions) {
      dimBreakdown[d] = { earned: 0, availableExam: 0, availableAttempted: 0 }
    }

    const diffBreakdown = {}
    for (const diff of difficulties) {
      diffBreakdown[diff] = { earned: 0, availableExam: 0, availableAttempted: 0 }
    }

    const topicBreakdown = {}
    for (const t of topics) {
      topicBreakdown[t] = { earned: 0, availableExam: 0, availableAttempted: 0 }
    }

    for (const q of questions) {
      const isAttempted =
        q.id in studentScores &&
        studentScores[q.id] !== null &&
        studentScores[q.id] !== undefined &&
        !isNaN(Number(studentScores[q.id]))

      const qScore = isAttempted ? Number(studentScores[q.id]) : 0

      if (isAttempted) {
        totalAttempted += q.marks
        earned += qScore
      }

      // Pro-rated dimension marks
      const qDims = q.dimensions || []
      const K = qDims.length || 1
      for (const d of qDims) {
        const dAvailable = q.dimensionMarks?.[d] ?? (q.marks / K)
        if (dimBreakdown[d]) {
          dimBreakdown[d].availableExam += dAvailable
          if (isAttempted) {
            dimBreakdown[d].availableAttempted += dAvailable
            dimBreakdown[d].earned += qScore * (1 / K)
          }
        }
      }

      // Difficulty marks
      const diff = q.difficulty || 'medium'
      if (diffBreakdown[diff]) {
        diffBreakdown[diff].availableExam += q.marks
        if (isAttempted) {
          diffBreakdown[diff].availableAttempted += q.marks
          diffBreakdown[diff].earned += qScore
        }
      }

      // Topic marks
      const qTopics = q.topics || []
      const T = qTopics.length || 1
      for (const t of qTopics) {
        if (topicBreakdown[t]) {
          topicBreakdown[t].availableExam += q.marks / T
          if (isAttempted) {
            topicBreakdown[t].availableAttempted += q.marks / T
            topicBreakdown[t].earned += qScore / T
          }
        }
      }
    }

    for (const d of dimensions) {
      const b = dimBreakdown[d]
      b.earned = round(b.earned, 2)
      b.availableExam = round(b.availableExam, 2)
      b.availableAttempted = round(b.availableAttempted, 2)
      b.available = b.availableExam
      b.attempted = b.availableAttempted
      b.masteryPct = pct(b.earned, b.availableExam)
      b.pct = b.masteryPct
      b.accuracyPct = pct(b.earned, b.availableAttempted)
      b.accuracy = b.accuracyPct
    }

    for (const diff of difficulties) {
      const b = diffBreakdown[diff]
      b.earned = round(b.earned, 2)
      b.availableExam = round(b.availableExam, 2)
      b.availableAttempted = round(b.availableAttempted, 2)
      b.available = b.availableExam
      b.attempted = b.availableAttempted
      b.masteryPct = pct(b.earned, b.availableExam)
      b.pct = b.masteryPct
      b.accuracyPct = pct(b.earned, b.availableAttempted)
      b.accuracy = b.accuracyPct
    }

    for (const t of topics) {
      const b = topicBreakdown[t]
      b.earned = round(b.earned, 2)
      b.availableExam = round(b.availableExam, 2)
      b.availableAttempted = round(b.availableAttempted, 2)
      b.available = b.availableExam
      b.attempted = b.availableAttempted
      b.masteryPct = pct(b.earned, b.availableExam)
      b.pct = b.masteryPct
      b.accuracyPct = pct(b.earned, b.availableAttempted)
      b.accuracy = b.accuracyPct
    }

    earned = round(earned, 2)
    totalAttempted = round(totalAttempted, 2)
    const masteryPct = totalExam > 0 ? round((earned / totalExam) * 100, 1) : 0
    const accuracyPct = totalAttempted > 0 ? round((earned / totalAttempted) * 100, 1) : null

    return {
      id: studentId,
      name,
      earned,
      totalExam,
      totalAttempted,
      total: totalExam,
      attempted: totalAttempted,
      masteryPct,
      pct: masteryPct,
      accuracyPct,
      accuracy: accuracyPct,
      dimensions: dimBreakdown,
      dimension: dimBreakdown,
      difficulties: diffBreakdown,
      difficulty: diffBreakdown,
      topics: topicBreakdown,
      topic: topicBreakdown,
      weakest: null,
      strongest: null,
      weakestDimension: null,
      strongestDimension: null,
      weakDimensions: [],
      strongDimensions: [],
      averageDimensions: [],
      hasWeakDimension: false,
      hasStrongDimension: false,
    }
  }

  const students = allStudentIds.map(buildStudentProfile)

  // Cohort profile: aggregate marks across all students
  const N = students.length || 1
  const cohortEarned = round(sumBy(students, 'earned') / N, 2)
  const cohortAttempted = round(sumBy(students, 'totalAttempted') / N, 2)
  const cohortMasteryPct = totalExam > 0 ? round((cohortEarned / totalExam) * 100, 1) : 0
  const cohortAccuracyPct = cohortAttempted > 0 ? round((cohortEarned / cohortAttempted) * 100, 1) : null

  const cohortDimensions = {}
  for (const d of dimensions) {
    const dEarned = round(sumBy(students, (s) => s.dimensions[d].earned) / N, 2)
    const dAvailableExam = students[0]?.dimensions[d]?.availableExam ?? 0
    const dAvailableAttempted = round(sumBy(students, (s) => s.dimensions[d].availableAttempted) / N, 2)
    cohortDimensions[d] = {
      earned: dEarned,
      availableExam: dAvailableExam,
      available: dAvailableExam,
      availableAttempted: dAvailableAttempted,
      attempted: dAvailableAttempted,
      masteryPct: pct(dEarned, dAvailableExam),
      pct: pct(dEarned, dAvailableExam),
      accuracyPct: pct(dEarned, dAvailableAttempted),
      accuracy: pct(dEarned, dAvailableAttempted),
    }
  }

  const cohortDifficulties = {}
  for (const diff of difficulties) {
    const diffEarned = round(sumBy(students, (s) => s.difficulties[diff].earned) / N, 2)
    const diffAvailableExam = students[0]?.difficulties[diff]?.availableExam ?? 0
    const diffAvailableAttempted = round(sumBy(students, (s) => s.difficulties[diff].availableAttempted) / N, 2)
    cohortDifficulties[diff] = {
      earned: diffEarned,
      availableExam: diffAvailableExam,
      available: diffAvailableExam,
      availableAttempted: diffAvailableAttempted,
      attempted: diffAvailableAttempted,
      masteryPct: pct(diffEarned, diffAvailableExam),
      pct: pct(diffEarned, diffAvailableExam),
      accuracyPct: pct(diffEarned, diffAvailableAttempted),
      accuracy: pct(diffEarned, diffAvailableAttempted),
    }
  }

  const cohortTopics = {}
  for (const t of topics) {
    const tEarned = round(sumBy(students, (s) => s.topics[t].earned) / N, 2)
    const tAvailableExam = students[0]?.topics[t]?.availableExam ?? 0
    const tAvailableAttempted = round(sumBy(students, (s) => s.topics[t].availableAttempted) / N, 2)
    cohortTopics[t] = {
      earned: tEarned,
      availableExam: tAvailableExam,
      available: tAvailableExam,
      availableAttempted: tAvailableAttempted,
      attempted: tAvailableAttempted,
      masteryPct: pct(tEarned, tAvailableExam),
      pct: pct(tEarned, tAvailableExam),
      accuracyPct: pct(tEarned, tAvailableAttempted),
      accuracy: pct(tEarned, tAvailableAttempted),
    }
  }

  const cohortActiveDims = dimensions.filter((d) => cohortDimensions[d].availableExam > 0 && cohortDimensions[d].masteryPct !== null)
  const cohortWeakest = cohortActiveDims.length
    ? minBy(cohortActiveDims, (d) => cohortDimensions[d].masteryPct)
    : null
  const cohortStrongest = cohortActiveDims.length
    ? maxBy(cohortActiveDims, (d) => cohortDimensions[d].masteryPct)
    : null

  const cohort = {
    id: 'cohort',
    name: `Cohort (${students.length})`,
    earned: cohortEarned,
    totalExam,
    totalAttempted: cohortAttempted,
    total: totalExam,
    attempted: cohortAttempted,
    masteryPct: cohortMasteryPct,
    pct: cohortMasteryPct,
    accuracyPct: cohortAccuracyPct,
    accuracy: cohortAccuracyPct,
    dimensions: cohortDimensions,
    dimension: cohortDimensions,
    difficulties: cohortDifficulties,
    difficulty: cohortDifficulties,
    topics: cohortTopics,
    topic: cohortTopics,
    weakest: cohortWeakest,
    strongest: cohortStrongest,
    weakestDimension: cohortWeakest,
    strongestDimension: cohortStrongest,
  }

  // Update student dimension statuses, weak/strong dimensions, and weakest/strongest
  for (const s of students) {
    const strongDims = []
    const weakDims = []
    const avgDims = []

    for (const d of dimensions) {
      const sDim = s.dimensions[d]
      if (!sDim) continue
      const cMastery = students.length > 1 ? cohortDimensions[d]?.masteryPct : null
      const status = classifyDimension(sDim.masteryPct, cMastery, thresholds)
      sDim.status = status

      const cohortMasteryVal = cohortDimensions[d]?.masteryPct
      sDim.diffFromCohort = (sDim.masteryPct !== null && cohortMasteryVal !== null && cohortMasteryVal !== undefined)
        ? round(sDim.masteryPct - cohortMasteryVal, 1)
        : 0

      if (sDim.availableExam > 0 && sDim.masteryPct !== null) {
        if (status === 'strong') strongDims.push(d)
        else if (status === 'weak') weakDims.push(d)
        else avgDims.push(d)
      }
    }

    s.strongDimensions = strongDims
    s.weakDimensions = weakDims
    s.averageDimensions = avgDims
    s.hasWeakDimension = weakDims.length > 0
    s.hasStrongDimension = strongDims.length > 0

    s.weakest = weakDims.length
      ? minBy(weakDims, (d) => s.dimensions[d].masteryPct)
      : null
    s.weakestDimension = s.weakest

    const activeDims = dimensions.filter((d) => s.dimensions[d].availableExam > 0 && s.dimensions[d].masteryPct !== null)
    s.strongest = activeDims.length
      ? maxBy(activeDims, (d) => s.dimensions[d].masteryPct)
      : null
    s.strongestDimension = s.strongest
  }

  const paperAnalysis = computePaperAnalysis(questions, scores, students, cohort, options)

  return {
    students,
    cohort,
    dimensions,
    difficulties,
    topics,
    paperAnalysis,
  }
}

