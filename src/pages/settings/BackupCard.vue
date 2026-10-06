<template>
  <SectionCard
    title="Backup"
    description="One file with your settings and every saved exam (with its scores). Restoring merges it into the saved data: exams with the same id are replaced and other exams are kept."
  >
    <div class="flex flex-wrap items-center gap-3">
      <Button variant="outline" @click="download"><DownloadIcon /> Download backup</Button>
      <div class="w-72">
        <FileInput accept=".json,application/json" aria-label="Restore from backup" @change="restore" />
      </div>
    </div>
  </SectionCard>
</template>

<script setup>
import { DownloadIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import FileInput from '@/components/common/FileInput.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import { useConfirm } from '@/composables/useConfirm.js'
import { downloadText } from '@/lib/download.js'
import * as api from '@/api.js'
import { useNoticeStore } from '@/stores/notice.js'
import { useSessionStore } from '@/stores/session.js'
import { useSettingsStore } from '@/stores/settings.js'

const { notify, fail } = useNoticeStore()
const { refreshSaved, refreshHistoryStudents } = useSessionStore()
const { load: loadSettings } = useSettingsStore()
const { confirm } = useConfirm()

async function download() {
  try {
    const backup = await api.getBackup()
    downloadText(`dimension-analysis-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup), 'application/json')
  } catch (err) {
    fail(err)
  }
}

async function restore(file, event) {
  if (!file) return
  try {
    const backup = JSON.parse(await file.text())
    const count = Array.isArray(backup.exams) ? backup.exams.length : 0
    const ok = await confirm({
      title: 'Restore this backup?',
      description: `${count} exam(s) and the settings will be restored. Exams with the same id will be replaced.`,
      confirmLabel: 'Restore',
    })
    if (!ok) return
    const { exams } = await api.restoreBackup(backup)
    await Promise.all([loadSettings(), refreshSaved(), refreshHistoryStudents()])
    notify('info', `Restored ${exams} exam(s) and the settings.`)
  } catch (err) {
    fail(err instanceof SyntaxError ? new Error('That file is not valid JSON.') : err)
  } finally {
    if (event?.target) event.target.value = ''
  }
}
</script>
