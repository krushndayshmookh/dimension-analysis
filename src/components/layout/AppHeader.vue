<template>
  <header class="no-print flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 class="text-xl font-semibold tracking-tight">Dimension Analysis</h1>
      <p class="text-sm text-muted-foreground">Recall · Comprehend · Solve · Build · Evaluate</p>
    </div>
    <div class="flex max-w-full flex-wrap items-center gap-2">
      <template v-if="exam">
      <Badge variant="secondary" class="h-auto max-w-full whitespace-normal py-1">{{ exam.courseName }} — {{ exam.examTitle }} ({{ exam.examDate }})</Badge>
      <Button variant="outline" size="sm" aria-label="Close exam" @click="closeExam"><XIcon /> Close</Button>
      </template>
      <span v-if="auth.user" class="text-sm text-muted-foreground">{{ auth.user }}</span>
      <Button variant="outline" size="sm" @click="auth.logout"><LogOutIcon /> Sign out</Button>
    </div>
  </header>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { LogOutIcon, XIcon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.js'
import { useSessionStore } from '@/stores/session.js'

const auth = useAuthStore()
const sessionStore = useSessionStore()
const { exam } = storeToRefs(sessionStore)
const { closeExam } = sessionStore
</script>
