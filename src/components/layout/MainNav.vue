<template>
  <nav class="no-print flex flex-col gap-2" aria-label="Main">
    <Tabs :model-value="activeGroup.id" @update:model-value="chooseGroup">
      <TabsList variant="line" class="h-9 border-b w-full justify-start">
        <TabsTrigger v-for="g in groups" :key="g.id" :value="g.id" class="flex-none px-3 text-sm font-semibold">{{ g.label }}</TabsTrigger>
      </TabsList>
    </Tabs>
    <div v-if="activeGroup.pages.length > 1" class="overflow-x-auto">
      <Tabs v-model="tab">
        <TabsList>
          <TabsTrigger v-for="p in activeGroup.pages" :key="p.id" :value="p.id" :disabled="p.needsExam && !exam" class="flex-none px-3">{{ p.label }}</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  </nav>
</template>

<script setup>
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GROUPS, PAGES } from '@/pages/index.js'
import { useSessionStore } from '@/stores/session.js'

const sessionStore = useSessionStore()
const { tab, exam } = storeToRefs(sessionStore)

const groups = GROUPS.map((g) => ({ ...g, pages: PAGES.filter((p) => p.group === g.id) })).filter((g) => g.pages.length)
const activeGroup = computed(() => groups.find((g) => g.pages.some((p) => p.id === tab.value)) ?? groups[0])

// Remember the last page of each group so switching back returns to it.
const lastPage = {}
watch(tab, (id) => {
  const group = groups.find((g) => g.pages.some((p) => p.id === id))
  if (group) lastPage[group.id] = id
}, { immediate: true })

function chooseGroup(id) {
  const group = groups.find((g) => g.id === id)
  const usable = (p) => !(p.needsExam && !exam.value)
  tab.value = lastPage[id] ?? group.pages.find(usable)?.id ?? group.pages[0].id
}
</script>
