import { ref } from 'vue'
import { mergeSettings, cloneSettings } from '@/lib/settings.js'
import * as api from '@/api.js'
import { useNotice } from './notice.js'

// The thresholds behind every tag. Defaults until the saved ones are loaded.
const settings = ref(mergeSettings())

export function useSettings() {
  const { fail, notify } = useNotice()
  return {
    settings,
    async load() {
      try {
        settings.value = mergeSettings(await api.getSettings())
      } catch (err) {
        fail(err)
      }
    },
    async save(next) {
      try {
        await api.saveSettings(next)
        settings.value = cloneSettings(next)
        notify('info', 'Settings saved.')
        return true
      } catch (err) {
        fail(err)
        return false
      }
    },
  }
}
