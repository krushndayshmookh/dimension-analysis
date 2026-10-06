<template>
  <AlertDialog :open="state.open" @update:open="(open) => !open && answer(false)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ state.title }}</AlertDialogTitle>
        <AlertDialogDescription v-if="state.description">{{ state.description }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="answer(false)">Cancel</AlertDialogCancel>
        <AlertDialogAction :variant="state.destructive ? 'destructive' : 'default'" @click="answer(true)">{{ state.confirmLabel }}</AlertDialogAction>
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
</script>
