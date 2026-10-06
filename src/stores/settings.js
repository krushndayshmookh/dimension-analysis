import { ref } from 'vue'
import { defineStore } from 'pinia'
import { mergeSettings, cloneSettings } from '@/lib/settings.js'
import * as api from '@/api.js'
import { useNoticeStore } from './notice.js'

// The thresholds behind every tag. Defaults until the saved ones are loaded.
export const useSettingsStore = defineStore('settings', () => {
  const notices = useNoticeStore()
  const settings = ref(mergeSettings())

  async function load() {
    try {
      settings.value = mergeSettings(await api.getSettings())
    } catch (err) {
      notices.fail(err)
    }
  }

  async function save(next) {
    try {
      await api.saveSettings(next)
      settings.value = cloneSettings(next)
      notices.notify('info', 'Settings saved.')
      return true
    } catch (err) {
      notices.fail(err)
      return false
    }
  }

  return { settings, load, save }
})
