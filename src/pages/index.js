import CohortPage from './CohortPage.vue'
import ComparePage from './ComparePage.vue'
import HistoryPage from './HistoryPage.vue'
import PaperPage from './PaperPage.vue'
import SavedExamsPage from './SavedExamsPage.vue'
import SettingsPage from './SettingsPage.vue'
import SimulationPage from './SimulationPage.vue'
import StudentPage from './StudentPage.vue'
import UploadPage from './UploadPage.vue'
import { TOOLS } from '@/tools/index.js'

export const GROUPS = [
  { id: 'analysis', label: 'Analysis' },
  { id: 'tools', label: 'Tools' },
  { id: 'library', label: 'Library' },
]

// Every page: { id, label, group, needsExam, component }. Tool pages come from
// the tools registry.
export const PAGES = [
  { id: 'cohort', label: 'Cohort', group: 'analysis', needsExam: true, component: CohortPage },
  { id: 'paper', label: 'Paper analysis', group: 'analysis', needsExam: true, component: PaperPage },
  { id: 'simulation', label: 'Simulation', group: 'analysis', needsExam: true, component: SimulationPage },
  { id: 'student', label: 'Student profile', group: 'analysis', needsExam: true, component: StudentPage },
  ...TOOLS.map((t) => ({ id: t.id, label: t.label, group: 'tools', needsExam: t.needsExam ?? true, component: t.component })),
  { id: 'upload', label: 'Upload', group: 'library', needsExam: false, component: UploadPage },
  { id: 'history', label: 'History', group: 'library', needsExam: false, component: HistoryPage },
  { id: 'compare', label: 'Compare exams', group: 'library', needsExam: false, component: ComparePage },
  { id: 'saved', label: 'Saved exams', group: 'library', needsExam: false, component: SavedExamsPage },
  { id: 'settings', label: 'Settings', group: 'library', needsExam: false, component: SettingsPage },
]
