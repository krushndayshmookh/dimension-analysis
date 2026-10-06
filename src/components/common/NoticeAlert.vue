<template>
  <Alert :variant="kind === 'error' ? 'destructive' : 'default'" :class="kind === 'info' ? 'border-info/40 bg-info/10' : ''" role="status">
    <component :is="kind === 'error' ? CircleAlertIcon : InfoIcon" />
    <AlertTitle v-if="title">{{ title }}</AlertTitle>
    <AlertDescription>
      <slot />
    </AlertDescription>
    <AlertAction v-if="dismissible">
      <Button variant="outline" size="xs" @click="$emit('dismiss')">Dismiss</Button>
    </AlertAction>
  </Alert>
</template>

<script setup>
import { CircleAlertIcon, InfoIcon } from '@lucide/vue'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

defineProps({
  kind: { type: String, default: 'info' }, // 'info' | 'error'
  title: { type: String, default: '' },
  dismissible: { type: Boolean, default: false },
})
defineEmits(['dismiss'])
</script>
