<template>
  <div class="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-4">
    <div>
      <h1 class="text-xl font-semibold tracking-tight">Dimension Analysis</h1>
      <p class="text-sm text-muted-foreground">Sign in to see your exams and students.</p>
    </div>
    <form class="grid gap-4" @submit.prevent="submit">
      <NoticeAlert v-if="error" kind="error">{{ error }}</NoticeAlert>
      <Field label="Username" html-for="username">
        <Input id="username" v-model="username" autocomplete="username" autocapitalize="none" spellcheck="false" required autofocus />
      </Field>
      <Field label="Password" html-for="password">
        <Input id="password" v-model="password" type="password" autocomplete="current-password" required />
      </Field>
      <Button type="submit" :disabled="busy">Sign in</Button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Field from '@/components/common/Field.vue'
import NoticeAlert from '@/components/common/NoticeAlert.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/auth.js'

const auth = useAuthStore()
const username = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  try {
    await auth.login(username.value, password.value)
  } catch (err) {
    error.value = err.message
    busy.value = false
  }
}
</script>
