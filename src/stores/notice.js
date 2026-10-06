import { ref } from 'vue'
import { defineStore } from 'pinia'

// The message banner shown under the navigation: { kind: 'info' | 'error', text }.
export const useNoticeStore = defineStore('notice', () => {
  const notice = ref(null)

  const notify = (kind, text) => {
    notice.value = { kind, text }
  }
  const fail = (err) => {
    notice.value = { kind: 'error', text: err?.message ?? String(err) }
  }
  const dismiss = () => {
    notice.value = null
  }

  return { notice, notify, fail, dismiss }
})
