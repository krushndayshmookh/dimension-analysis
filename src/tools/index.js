import QuestionReview from './QuestionReview.vue'

// Registry of the tool pages shown under "Tools". Each entry is
// { id, label, component }. A tool reads the open exam, saved exams and settings
// via inject('exam' | 'savedExams' | 'settings') and emits 'open-student'.
export const TOOLS = [
  { id: 'review', label: 'Question review', component: QuestionReview },
]
