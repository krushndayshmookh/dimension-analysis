<template>
  <div class="flex flex-col gap-6">
    <PageHeader
      title="Settings"
      description="The thresholds behind every colored tag, verdict and flag. Each section says what its rules affect. Changes apply once saved, and are stored with your data."
    />

    <SettingsGroupCard v-for="group in SETTINGS_SCHEMA" :key="group.title" :group="group" :draft="draft" @change="setField" />

    <BackupCard />

    <NoticeAlert v-if="errors.length" kind="error">
      <ul class="list-disc pl-5"><li v-for="(e, i) in errors" :key="i">{{ e }}</li></ul>
    </NoticeAlert>

    <div class="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-2 border-t bg-background/95 px-1 py-3 backdrop-blur">
      <Button :disabled="errors.length > 0 || !dirty" @click="save(draft)">Save settings</Button>
      <Button variant="outline" @click="resetToDefaults">Reset to defaults</Button>
      <Button v-if="dirty" variant="outline" @click="discard">Discard changes</Button>
      <span v-if="dirty" class="text-sm text-muted-foreground">Unsaved changes.</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Button } from '@/components/ui/button'
import NoticeAlert from '@/components/common/NoticeAlert.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { DEFAULT_SETTINGS, SETTINGS_SCHEMA, cloneSettings, setPath, validateSettings } from '@/lib/settings.js'
import { useSettingsStore } from '@/stores/settings.js'
import BackupCard from './settings/BackupCard.vue'
import SettingsGroupCard from './settings/SettingsGroupCard.vue'

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
const { save } = settingsStore

const draft = ref(cloneSettings(settings.value))
// Settings are replaced when loaded, saved or restored: start the draft from them again.
watch(settings, (s) => {
  draft.value = cloneSettings(s)
})

const errors = computed(() => validateSettings(draft.value))
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(settings.value))

const setField = (field, value) => {
  draft.value = setPath(draft.value, field.path, value)
}
const resetToDefaults = () => {
  draft.value = cloneSettings(DEFAULT_SETTINGS)
}
const discard = () => {
  draft.value = cloneSettings(settings.value)
}
</script>
