<template>
  <Dialog>
    <DialogTrigger as-child>
      <Button variant="outline" size="sm" class="no-print"><CircleHelpIcon /> Learn more</Button>
    </DialogTrigger>
    <DialogContent class="flex max-h-[85vh] flex-col gap-3 sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{{ help.title }}</DialogTitle>
        <DialogDescription>{{ help.about }}</DialogDescription>
      </DialogHeader>
      <div class="flex min-h-0 flex-col gap-5 overflow-y-auto pr-1">
        <section v-for="part in help.parts" :key="part.heading" class="flex flex-col gap-2">
          <h4 class="text-sm font-semibold">{{ part.heading }}</h4>
          <dl class="flex flex-col gap-2.5">
            <div v-for="entry in part.entries" :key="entry.term">
              <dt class="text-sm font-medium">{{ entry.term }}</dt>
              <dd class="text-sm text-muted-foreground">{{ entry.text }}</dd>
            </div>
          </dl>
        </section>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { computed } from 'vue'
import { CircleHelpIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { HELP } from '@/lib/help.js'

// A "Learn more" button opening a dialog that explains an analysis section: what it
// shows, what each table column means and how each graph is read. topic is a key of HELP.
const props = defineProps({ topic: { type: String, required: true } })
const help = computed(() => HELP[props.topic])
</script>
