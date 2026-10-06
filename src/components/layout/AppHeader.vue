<template>
  <header class="no-print flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 class="text-xl font-semibold tracking-tight">Dimension Analysis</h1>
      <p class="text-sm text-muted-foreground">Recall · Comprehend · Solve · Build · Evaluate</p>
    </div>
    <Badge v-if="exam" variant="secondary" class="h-auto max-w-full whitespace-normal py-1">{{ exam.courseName }} — {{ exam.examTitle }} ({{ exam.examDate }})</Badge>
  </header>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { Badge } from '@/components/ui/badge'
import { useSessionStore } from '@/stores/session.js'

const sessionStore = useSessionStore()
const { exam } = storeToRefs(sessionStore)
</script>
