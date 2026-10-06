import { ref } from 'vue'

// The message banner shown under the navigation: { kind: 'info' | 'error', text }.
const notice = ref(null)

export function useNotice() {
  return {
    notice,
    notify: (kind, text) => {
      notice.value = { kind, text }
    },
    fail: (err) => {
      notice.value = { kind: 'error', text: err?.message ?? String(err) }
    },
    dismiss: () => {
      notice.value = null
    },
  }
}
