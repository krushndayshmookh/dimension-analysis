import CohortPage from './CohortPage.vue'
import ComparePage from './ComparePage.vue'
import DashboardPage from './DashboardPage.vue'
import HistoryPage from './HistoryPage.vue'
import PaperPage from './PaperPage.vue'
import SavedExamsPage from './SavedExamsPage.vue'
import SettingsPage from './SettingsPage.vue'
import SimulationPage from './SimulationPage.vue'
import StudentPage from './StudentPage.vue'
import UploadPage from './UploadPage.vue'
import Correlations from '@/tools/Correlations.vue'
import Distractors from '@/tools/Distractors.vue'
import FeedbackSheets from '@/tools/FeedbackSheets.vue'
import GradeBands from '@/tools/GradeBands.vue'
import QuestionReview from '@/tools/QuestionReview.vue'
import Sections from '@/tools/Sections.vue'
import SheetConverter from '@/tools/SheetConverter.vue'
import WhatIf from '@/tools/WhatIf.vue'
import { GROUPS, PAGE_META } from './registry.js'

export { GROUPS }

const COMPONENTS = {
  cohort: CohortPage,
  student: StudentPage,
  sections: Sections,
  bands: GradeBands,
  correlations: Correlations,
  feedback: FeedbackSheets,
  paper: PaperPage,
  review: QuestionReview,
  distractors: Distractors,
  simulation: SimulationPage,
  whatif: WhatIf,
  history: HistoryPage,
  compare: ComparePage,
  dashboard: DashboardPage,
  upload: UploadPage,
  convert: SheetConverter,
  saved: SavedExamsPage,
  settings: SettingsPage,
}

// Every page: { id, label, group, needsExam, component }.
export const PAGES = PAGE_META.map((page) => ({ ...page, component: COMPONENTS[page.id] }))
