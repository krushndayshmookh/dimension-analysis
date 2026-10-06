// The pages and how they are grouped in the navigation, without their components
// (see index.js), so the structure can be tested on its own. Pages are grouped by
// what the instructor is trying to do.

export const GROUPS = [
  { id: 'students', label: 'Students' },
  { id: 'paper', label: 'Paper' },
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'time', label: 'Over time' },
  { id: 'data', label: 'Data' },
  { id: 'settings', label: 'Settings' },
]

// { id, label, group, needsExam }, in navigation order. Pages that read the open
// exam are disabled until one is open.
export const PAGE_META = [
  { id: 'cohort', label: 'Cohort', group: 'students', needsExam: true },
  { id: 'student', label: 'Student profile', group: 'students', needsExam: true },
  { id: 'sections', label: 'Sections', group: 'students', needsExam: true },
  { id: 'bands', label: 'Grade bands', group: 'students', needsExam: true },
  { id: 'correlations', label: 'Correlations', group: 'students', needsExam: true },
  { id: 'feedback', label: 'Feedback sheets', group: 'students', needsExam: true },

  { id: 'paper', label: 'Paper analysis', group: 'paper', needsExam: true },
  { id: 'review', label: 'Question review', group: 'paper', needsExam: true },
  { id: 'distractors', label: 'Distractors', group: 'paper', needsExam: true },

  { id: 'simulation', label: 'Simulation', group: 'scenarios', needsExam: true },
  { id: 'whatif', label: 'What-if', group: 'scenarios', needsExam: true },

  { id: 'history', label: 'History', group: 'time', needsExam: false },
  { id: 'compare', label: 'Compare exams', group: 'time', needsExam: false },

  { id: 'dashboard', label: 'Dashboard', group: 'data', needsExam: false },
  { id: 'cohorts', label: 'Cohorts', group: 'data', needsExam: false },
  { id: 'upload', label: 'Upload exam', group: 'data', needsExam: false },
  { id: 'convert', label: 'Sheet converter', group: 'data', needsExam: false },
  { id: 'saved', label: 'Saved exams', group: 'data', needsExam: false },
  { id: 'settings', label: 'Settings', group: 'settings', needsExam: false },
]

export const pagesOf = (groupId) => PAGE_META.filter((p) => p.group === groupId)

// Shown when no exam is open, and the page an exam opens on.
export const DEFAULT_PAGE = 'dashboard'
export const EXAM_LANDING_PAGE = 'cohort'
