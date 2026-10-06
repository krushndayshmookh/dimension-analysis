<template>
  <div class="mx-auto flex max-w-[110rem] flex-col gap-4 p-4 pb-10">
    <AppHeader />
    <MainNav />

    <NoticeAlert v-if="notice" :kind="notice.kind" dismissible @dismiss="dismiss">{{ notice.text }}</NoticeAlert>

    <main>
      <!-- Pages stay alive while switching tabs. The cache is rebuilt when another exam is opened,
           so no cached page ever recalculates against the wrong exam. -->
      <KeepAlive :key="examKey" :max="40">
        <component :is="page.component" v-if="page && (!page.needsExam || exam)" :key="page.id" @open-student="openStudent" />
      </KeepAlive>
    </main>

    <ConfirmDialog />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import AppHeader from '@/components/layout/AppHeader.vue'
import MainNav from '@/components/layout/MainNav.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import NoticeAlert from '@/components/common/NoticeAlert.vue'
import { PAGES } from '@/pages/index.js'
import { useNoticeStore } from '@/stores/notice.js'
import { useSessionStore } from '@/stores/session.js'
import { useSettingsStore } from '@/stores/settings.js'

const sessionStore = useSessionStore()
const { tab, exam, examKey } = storeToRefs(sessionStore)
const { openStudent, refreshSaved, refreshHistoryStudents, refreshCohorts } = sessionStore
const settingsStore = useSettingsStore()
const noticeStore = useNoticeStore()
const { notice } = storeToRefs(noticeStore)
const { dismiss } = noticeStore

const page = computed(() => PAGES.find((p) => p.id === tab.value))

onMounted(() => {
  settingsStore.load()
  refreshSaved()
  refreshCohorts()
  refreshHistoryStudents()
})
</script>
