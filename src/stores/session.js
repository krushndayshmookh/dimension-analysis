import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { analyzeDataset } from '@/lib/analysis.js'
import * as api from '@/api.js'
import { useNoticeStore } from './notice.js'

// State shared by every page: the open exam, the saved exams and the current page.
export const useSessionStore = defineStore('session', () => {
  const notices = useNoticeStore()

  const tab = ref('upload')
  // { id, courseName, examTitle, examDate, dataset, profiles, paper }. Shallow: the
  // analysis is large and never mutated, so it is not made deeply reactive.
  const exam = shallowRef(null)
  // Changes whenever an exam is opened (not when its id is filled in after saving).
  const examKey = ref(0)
  const savedExams = ref([])
  const selectedStudentId = ref('')
  const historyStudents = ref([])
  const historyStudentId = ref('')

  const dataset = computed(() => exam.value?.dataset ?? null)
  const profiles = computed(() => exam.value?.profiles ?? null)
  const paper = computed(() => exam.value?.paper ?? null)

  function openExam({ id = null, courseName, examTitle, examDate, dataset: data }) {
    const { profiles: p, paper: pa } = analyzeDataset(data)
    exam.value = { id, courseName, examTitle, examDate, dataset: data, profiles: p, paper: pa }
    examKey.value++
    selectedStudentId.value = p.students[0]?.id ?? ''
  }

  async function refreshSaved() {
    try {
      savedExams.value = await api.listExams()
    } catch (err) {
      notices.fail(err)
    }
  }

  async function refreshHistoryStudents() {
    try {
      historyStudents.value = await api.listStudents()
    } catch (err) {
      notices.fail(err)
    }
  }

  async function loadSaved(entry) {
    try {
      const saved = await api.getExam(entry.id)
      if (!saved.dataset?.questions || !saved.dataset?.students) {
        throw new Error('This exam was saved in an older, incompatible format. Upload its CSV files again.')
      }
      openExam(saved)
      tab.value = 'cohort'
    } catch (err) {
      notices.fail(err)
    }
  }

  async function removeSaved(entry) {
    try {
      await api.deleteExam(entry.id)
      await Promise.all([refreshSaved(), refreshHistoryStudents()])
      return true
    } catch (err) {
      notices.fail(err)
      return false
    }
  }

  function openStudent(id) {
    selectedStudentId.value = id
    tab.value = 'student'
  }

  async function openHistory(studentId) {
    await refreshHistoryStudents()
    historyStudentId.value = studentId
    tab.value = 'history'
  }

  return {
    tab,
    exam,
    examKey,
    dataset,
    profiles,
    paper,
    savedExams,
    selectedStudentId,
    historyStudents,
    historyStudentId,
    openExam,
    refreshSaved,
    refreshHistoryStudents,
    loadSaved,
    removeSaved,
    openStudent,
    openHistory,
  }
})
