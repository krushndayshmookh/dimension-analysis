import QuestionReview from './QuestionReview.vue'
import Sections from './Sections.vue'
import Correlations from './Correlations.vue'
import FeedbackSheets from './FeedbackSheets.vue'
import WhatIf from './WhatIf.vue'
import GradeBands from './GradeBands.vue'
import Distractors from './Distractors.vue'

// Registry of the tool pages shown under "Tools". Each entry is
// { id, label, component }. A tool reads the open exam, saved exams and settings
// via inject('exam' | 'savedExams' | 'settings') and emits 'open-student'.
export const TOOLS = [
  { id: 'review', label: 'Question review', component: QuestionReview },
  { id: 'sections', label: 'Sections', component: Sections },
  { id: 'correlations', label: 'Correlations', component: Correlations },
  { id: 'feedback', label: 'Feedback sheets', component: FeedbackSheets },
  { id: 'whatif', label: 'What-if', component: WhatIf },
  { id: 'bands', label: 'Grade bands', component: GradeBands },
  { id: 'distractors', label: 'Distractors', component: Distractors },
]
