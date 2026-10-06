<template>
  <header class="no-print flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 class="text-xl font-semibold tracking-tight">Dimension Analysis</h1>
      <p class="text-sm text-muted-foreground">Recall · Comprehend · Solve · Build · Evaluate</p>
    </div>
    <div v-if="exam" class="flex max-w-full items-center gap-2">
      <Badge variant="secondary" class="h-auto max-w-full whitespace-normal py-1">{{ exam.courseName }} — {{ exam.examTitle }} ({{ exam.examDate }})</Badge>
      <Button variant="outline" size="sm" aria-label="Close exam" @click="closeExam"><XIcon /> Close</Button>
    </div>
  </header>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { XIcon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSessionStore } from '@/stores/session.js'

const sessionStore = useSessionStore()
const { exam } = storeToRefs(sessionStore)
const { closeExam } = sessionStore
</script>
