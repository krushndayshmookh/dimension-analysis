import { reactive } from 'vue'

// One confirmation dialog for the whole app (see ConfirmDialog.vue):
//   if (await confirm({ title, description, confirmLabel })) { ... }
const state = reactive({ open: false, title: '', description: '', confirmLabel: 'Confirm', destructive: false })
let resolver = null

export function useConfirm() {
  return {
    state,
    confirm({ title, description = '', confirmLabel = 'Confirm', destructive = false }) {
      Object.assign(state, { open: true, title, description, confirmLabel, destructive })
      return new Promise((resolve) => {
        resolver = resolve
      })
    },
    answer(value) {
      state.open = false
      resolver?.(value)
      resolver = null
    },
  }
}
