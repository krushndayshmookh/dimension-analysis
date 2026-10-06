<template>
  <AlertDialog :open="state.open" @update:open="onOpenChange">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ state.title }}</AlertDialogTitle>
        <AlertDialogDescription v-if="state.description">{{ state.description }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction :variant="state.destructive ? 'destructive' : 'default'" @click="confirmed = true">{{ state.confirmLabel }}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup>
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useConfirm } from '@/composables/useConfirm.js'

const { state, answer } = useConfirm()

// The dialog closes itself on either button, possibly before the button's own click
// handler runs, so the answer is read after the close from a flag the Confirm
// button sets, not from the order of events.
let confirmed = false
function onOpenChange(open) {
  if (open) return
  setTimeout(() => {
    answer(confirmed)
    confirmed = false
  })
}
</script>
