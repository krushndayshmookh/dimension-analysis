import { DIMENSIONS, DIFFICULTIES } from './constants.js'

// Every threshold behind a verdict, tag or flag lives here. Nothing in the
// analysis modules uses these; they are applied when results are displayed.

const nullTargets = (names) => Object.fromEntries(names.map((n) => [n, null]))

export const DEFAULT_SETTINGS = {
  showVerdicts: true,
  mastery: { weakBelow: 50, strongFrom: 80 },
  cohortMargin: { enabled: false, marginPp: 15 },
  deviation: { lowBelow: 10, highFrom: 20 },
  difficulty: { veryDifficultBelow: 40, difficultBelow: 55, balancedBelow: 70, easyBelow: 85 },
  attainment: { passMark: 50, distinctionMark: 75 },
  attention: { nearPassMarginPp: 5, weakDimensionCount: 2 },
  tiers: { inversionTolerancePp: 2 },
  simulationGap: { alignedBelow: 5, largeFrom: 15 },
  dimensionSpread: { balancedBelow: 15, highFrom: 30 },
  questionFlags: { tooEasyFrom: 90, tooHardBelow: 20, lowAttemptBelow: 70 },
  discrimination: { poorBelow: 0.2, goodFrom: 0.3 },
  reliability: { acceptableFrom: 0.7 },
  trend: { notableChangePp: 10 },
  review: { alphaGainFrom: 0.02, flagReuse: true },
  sections: { minSize: 5, significance: 0.05 },
  blueprint: {
    tolerancePp: 5,
    dimensions: nullTargets(DIMENSIONS),
    difficulties: nullTargets(DIFFICULTIES),
  },
}

// Deep copy of plain data. Unlike structuredClone it also works on Vue reactive
// proxies, and it keeps NaN (an emptied number field) as NaN.
export function cloneSettings(value) {
  if (Array.isArray(value)) return value.map(cloneSettings)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cloneSettings(v)]))
  return value
}

export const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)

export function setPath(obj, path, value) {
  const copy = cloneSettings(obj)
  const keys = path.split('.')
  let target = copy
  for (const k of keys.slice(0, -1)) target = target[k]
  target[keys.at(-1)] = value
  return copy
}

// Overlays saved settings on the defaults. Unknown keys and values of the
// wrong type are dropped, so a stale or hand-edited file can never break the app.
export function mergeSettings(saved) {
  const merge = (template, source) => {
    const out = {}
    for (const [key, def] of Object.entries(template)) {
      const value = source && typeof source === 'object' ? source[key] : undefined
      if (def === null) out[key] = typeof value === 'number' && Number.isFinite(value) ? value : null
      else if (typeof def === 'object') out[key] = merge(def, value)
      else if (typeof def === 'number') out[key] = typeof value === 'number' && Number.isFinite(value) ? value : def
      else out[key] = typeof value === 'boolean' ? value : def
    }
    return out
  }
  return merge(DEFAULT_SETTINGS, saved)
}

const pctField = (path, label, description, extra = {}) => ({
  path, label, description, type: 'number', unit: '%', min: 0, max: 100, step: 1, ...extra,
})
const ppField = (path, label, description, extra = {}) => ({
  path, label, description, type: 'number', unit: 'pp', min: 0, max: 100, step: 1, ...extra,
})

// Drives the Settings page: each group explains what its rules affect.
export const SETTINGS_SCHEMA = [
  {
    title: 'Display',
    description: 'Controls whether colored verdict tags (Weak, Strong, Low/Medium/High, ...) are shown anywhere. The numbers are always shown.',
    fields: [
      { path: 'showVerdicts', label: 'Show verdict tags', type: 'boolean', description: 'Turn off to see only the measured values, with no colored tags on any screen.' },
    ],
  },
  {
    title: 'Mastery levels',
    description: 'Decides the Weak / Average / Strong tag on mastery percentages: students, dimensions, difficulty tiers, topics and the cohort. Mastery is marks earned divided by the marks available.',
    fields: [
      pctField('mastery.weakBelow', 'Weak below', 'A mastery percentage below this is tagged Weak. Also used for "weak in N dimensions" under Students needing attention.'),
      pctField('mastery.strongFrom', 'Strong from', 'A mastery percentage at or above this is tagged Strong. Values between the two limits are Average.'),
      { path: 'cohortMargin.enabled', label: 'Also compare with the cohort', type: 'boolean', description: 'When on, a student is only tagged Weak or Strong in a dimension if they are also at least the margin below or above the cohort average there, so a hard paper does not tag everyone Weak.' },
      ppField('cohortMargin.marginPp', 'Cohort margin', 'How many percentage points below (Weak) or above (Strong) the cohort average a student must be. Only used when the option above is on.'),
    ],
  },
  {
    title: 'Solve-rate deviation',
    description: 'Decides the Low / Medium / High tag on each question\'s deviation, which is the actual solve rate minus the expected solve rate. The tag looks at the size of the gap; the sign shows whether the question was easier or harder than expected.',
    fields: [
      ppField('deviation.lowBelow', 'Low below', 'A gap smaller than this is Low (green): the question behaved as expected.'),
      ppField('deviation.highFrom', 'High from', 'A gap this large or larger is High (red). Gaps in between are Medium (yellow).'),
    ],
  },
  {
    title: 'Overall difficulty',
    description: 'Decides the paper difficulty tag, based on the cohort mean mastery: Very difficult, Difficult, Balanced, Easy, Very easy. Shown on the Cohort and Paper analysis screens.',
    fields: [
      pctField('difficulty.veryDifficultBelow', 'Very difficult below', 'Cohort mean below this is Very difficult.'),
      pctField('difficulty.difficultBelow', 'Difficult below', 'Cohort mean from the previous limit up to this is Difficult.'),
      pctField('difficulty.balancedBelow', 'Balanced below', 'Cohort mean from the previous limit up to this is Balanced.'),
      pctField('difficulty.easyBelow', 'Easy below', 'Cohort mean from the previous limit up to this is Easy; at or above it is Very easy.'),
    ],
  },
  {
    title: 'Pass and distinction',
    description: 'Sets the marks used for pass and distinction counts on the Cohort screen and for flagging students who need attention.',
    fields: [
      pctField('attainment.passMark', 'Pass mark', 'Students at or above this overall mastery count as passing. Students below it are flagged as needing attention.'),
      pctField('attainment.distinctionMark', 'Distinction mark', 'Students at or above this overall mastery count as achieving distinction.'),
    ],
  },
  {
    title: 'Students needing attention',
    description: 'Decides who appears in the "Students needing attention" list, together with the pass mark above.',
    fields: [
      ppField('attention.nearPassMarginPp', 'Near-pass margin', 'Students from the pass mark up to the pass mark plus this many points are listed as near the pass mark.'),
      { path: 'attention.weakDimensionCount', label: 'Weak dimensions to flag', type: 'number', unit: '', min: 1, max: 5, step: 1, integer: true, description: 'Students tagged Weak in at least this many dimensions are listed, even if they passed.' },
    ],
  },
  {
    title: 'Difficulty tier order',
    description: 'Decides when the Paper analysis screen marks a difficulty tier as out of order: a harder tier with higher mean mastery than the next easier tier that has questions.',
    fields: [
      ppField('tiers.inversionTolerancePp', 'Inversion tolerance', 'A harder tier must beat the easier one by more than this many points to be marked out of order.', { step: 0.5 }),
    ],
  },
  {
    title: 'Simulation gaps',
    description: 'Decides the Aligned / Moderate / Large tag on gaps between the simulated (expected) cohort and the actual cohort on the Simulation screen. A gap is actual minus expected, in percentage points.',
    fields: [
      ppField('simulationGap.alignedBelow', 'Aligned below', 'A gap smaller than this is Aligned.'),
      ppField('simulationGap.largeFrom', 'Large from', 'A gap this large or larger is Large. Gaps in between are Moderate.'),
    ],
  },
  {
    title: 'Dimension balance',
    description: 'Decides the Balanced / Moderate / High tag on the spread between the highest and lowest dimension mean mastery on the Paper analysis screen.',
    fields: [
      ppField('dimensionSpread.balancedBelow', 'Balanced below', 'A spread smaller than this is Balanced.'),
      ppField('dimensionSpread.highFrom', 'High from', 'A spread this large or larger is High. Spreads in between are Moderate.'),
    ],
  },
  {
    title: 'Question flags',
    description: 'Decides the flags shown on each question in the Paper analysis question table.',
    fields: [
      pctField('questionFlags.tooEasyFrom', 'Too easy from', 'Questions solved (full marks) by at least this percentage of students are flagged Too easy.'),
      pctField('questionFlags.tooHardBelow', 'Too hard below', 'Questions solved by less than this percentage of students are flagged Too hard.'),
      pctField('questionFlags.lowAttemptBelow', 'Many skipped below', 'Questions attempted by less than this percentage of students are flagged Many skipped.'),
    ],
  },
  {
    title: 'Question quality',
    description: 'Decides the discrimination tag on each question and the reliability tag on the exam. The discrimination index compares the top and bottom 27% of students on a question: 1 means only top students got it right, a negative value means weaker students did better.',
    fields: [
      { path: 'discrimination.poorBelow', label: 'Poor below', type: 'number', unit: '', min: 0, max: 1, step: 0.05, description: 'A discrimination index below this is Poor (red). A negative index is always tagged Negative.' },
      { path: 'discrimination.goodFrom', label: 'Good from', type: 'number', unit: '', min: 0, max: 1, step: 0.05, description: 'An index at or above this is Good (green). Values between the two limits are Fair (yellow).' },
      { path: 'reliability.acceptableFrom', label: 'Reliability acceptable from', type: 'number', unit: '', min: 0, max: 1, step: 0.05, description: 'Cronbach\'s alpha at or above this is tagged Acceptable; below it is Low. Alpha measures how consistently the questions measure the same thing.' },
    ],
  },
  {
    title: 'Question review',
    description: 'Decides which questions land in the ranked review queue on the Question review tool, in addition to the question flags and deviation levels above.',
    fields: [
      { path: 'review.alphaGainFrom', label: 'Reliability gain to flag', type: 'number', unit: '', min: 0, max: 1, step: 0.01, description: 'A question is flagged "Lowers reliability" when the exam\'s Cronbach\'s alpha would rise by at least this much if the question were removed.' },
      { path: 'review.flagReuse', label: 'Flag reused questions', type: 'boolean', description: 'When on, a question that also appeared in an earlier saved exam (same type and id) is added to the review queue as Reused.' },
    ],
  },
  {
    title: 'Sections',
    description: 'Used by the Sections tool, which compares sections (batches) given in the student file.',
    fields: [
      { path: 'sections.minSize', label: 'Small section below', type: 'number', unit: 'students', min: 1, max: 1000, step: 1, integer: true, description: 'A section with fewer students than this is tagged Small section, because its averages are unreliable.' },
      { path: 'sections.significance', label: 'Significance level', type: 'number', unit: '', min: 0.001, max: 0.5, step: 0.01, description: 'The difference between sections is tagged Significant when the ANOVA p-value is below this. A small p-value means the difference is unlikely to be chance alone; it does not say the difference matters.' },
    ],
  },
  {
    title: 'Trends',
    description: 'Decides the Gain / Steady / Drop tag on changes in mastery between exams in the History and Compare screens.',
    fields: [
      ppField('trend.notableChangePp', 'Notable change', 'A change of at least this many points up is a Gain, and down is a Drop. Smaller changes are Steady.'),
    ],
  },
  {
    title: 'Paper blueprint (optional)',
    description: 'Lets you state how many marks each dimension and difficulty tier should carry. The Paper analysis screen then compares the actual share with your target. Leave a target empty to skip it.',
    fields: [
      ppField('blueprint.tolerancePp', 'Tolerance', 'A share within this many points of its target is On target; further away is Over or Under.'),
      ...DIMENSIONS.map((d) => ({ path: `blueprint.dimensions.${d}`, label: `${d} target`, type: 'target', unit: '%', min: 0, max: 100, step: 1, description: `Intended share of the exam's marks for the ${d} dimension. Empty = no target.` })),
      ...DIFFICULTIES.map((d) => ({ path: `blueprint.difficulties.${d}`, label: `${d[0].toUpperCase()}${d.slice(1)} tier target`, type: 'target', unit: '%', min: 0, max: 100, step: 1, description: `Intended share of the exam's marks in the ${d} difficulty tier. Empty = no target.` })),
    ],
  },
]

const fields = SETTINGS_SCHEMA.flatMap((g) => g.fields)

// Pairs that must be strictly increasing, with the message used when they are not.
const ORDERINGS = [
  [['mastery.weakBelow', 'mastery.strongFrom'], 'The weak threshold (mastery.weakBelow) must be below the strong threshold (mastery.strongFrom)'],
  [['deviation.lowBelow', 'deviation.highFrom'], 'The low-deviation limit (deviation.lowBelow) must be below the high-deviation limit (deviation.highFrom)'],
  [['difficulty.veryDifficultBelow', 'difficulty.difficultBelow', 'difficulty.balancedBelow', 'difficulty.easyBelow'], 'The overall-difficulty limits (difficulty.*) must increase from Very difficult to Easy'],
  [['attainment.passMark', 'attainment.distinctionMark'], 'The pass mark (attainment.passMark) must be below the distinction mark (attainment.distinctionMark)'],
  [['simulationGap.alignedBelow', 'simulationGap.largeFrom'], 'The aligned limit (simulationGap.alignedBelow) must be below the large-gap limit (simulationGap.largeFrom)'],
  [['dimensionSpread.balancedBelow', 'dimensionSpread.highFrom'], 'The balanced limit (dimensionSpread.balancedBelow) must be below the high-spread limit (dimensionSpread.highFrom)'],
  [['discrimination.poorBelow', 'discrimination.goodFrom'], 'The poor limit (discrimination.poorBelow) must be below the good limit (discrimination.goodFrom)'],
  [['questionFlags.tooHardBelow', 'questionFlags.tooEasyFrom'], 'The too-hard limit (questionFlags.tooHardBelow) must be below the too-easy limit (questionFlags.tooEasyFrom)'],
]

// Returns a list of problems; empty means the settings are valid.
export function validateSettings(settings) {
  const errors = []
  for (const f of fields) {
    const value = getPath(settings, f.path)
    if (f.type === 'boolean') {
      if (typeof value !== 'boolean') errors.push(`${f.label} (${f.path}) must be on or off`)
      continue
    }
    if (f.type === 'target' && value === null) continue
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors.push(`${f.label} (${f.path}) must be a number`)
    } else if (value < f.min || value > f.max) {
      errors.push(`${f.label} (${f.path}) must be between ${f.min} and ${f.max}`)
    } else if (f.integer && !Number.isInteger(value)) {
      errors.push(`${f.label} (${f.path}) must be a whole number`)
    }
  }
  for (const [paths, message] of ORDERINGS) {
    const values = paths.map((p) => getPath(settings, p))
    if (values.every((v) => typeof v === 'number') && values.some((v, i) => i > 0 && v <= values[i - 1])) errors.push(message)
  }
  return errors
}
