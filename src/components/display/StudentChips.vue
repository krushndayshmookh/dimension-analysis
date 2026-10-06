<template>
  <Collapsible v-if="students.length">
    <CollapsibleTrigger as-child>
      <Button variant="link" size="xs" class="h-auto p-0">{{ students.length }} student{{ students.length === 1 ? '' : 's' }}</Button>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div class="mt-1 flex max-w-md flex-wrap gap-1">
        <Button v-for="s in students" :key="s.id" variant="secondary" size="xs" @click="$emit('select', s.id)">{{ s.label }}</Button>
      </div>
    </CollapsibleContent>
  </Collapsible>
  <span v-else class="text-muted-foreground">—</span>
</template>

<script setup>
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

// students: [{ id, label }]
defineProps({ students: { type: Array, required: true } })
defineEmits(['select'])
</script>
