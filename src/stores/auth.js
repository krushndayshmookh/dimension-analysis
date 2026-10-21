import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as api from '../api.js'

// Who is signed in. Signing in or out reloads the page, so no store ever keeps
// one account's data in memory for the next.
export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const checked = ref(false)

  api.setSignedOutHandler(() => {
    user.value = null
  })

  async function init() {
    try {
      user.value = (await api.getCurrentUser()).username
    } catch {
      user.value = null
    }
    checked.value = true
  }

  async function login(username, password) {
    await api.signIn(username, password)
    window.location.reload()
  }

  async function logout() {
    try {
      await api.signOut()
    } finally {
      window.location.reload()
    }
  }

  return { user, checked, init, login, logout }
})
