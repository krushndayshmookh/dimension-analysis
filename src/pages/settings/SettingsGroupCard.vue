<template>
  <SectionCard :title="group.title" :description="group.description">
    <div
      v-for="f in group.fields"
      :key="f.path"
      class="grid items-start gap-x-4 gap-y-1 border-t pt-3 md:grid-cols-[14rem_11rem_minmax(0,1fr)]"
    >
      <Label :for="`set-${f.path}`" class="pt-1.5">{{ f.label }}</Label>

      <div v-if="f.type === 'bands'" class="md:col-span-2">
        <BandsEditor :model-value="valueOf(f)" @update:model-value="(v) => $emit('change', f, v)" />
      </div>
      <div v-else class="flex items-center gap-2">
        <Switch v-if="f.type === 'boolean'" :id="`set-${f.path}`" :model-value="valueOf(f)" @update:model-value="(v) => $emit('change', f, v)" />
        <template v-else>
          <NumberInput
            :id="`set-${f.path}`"
            :model-value="valueOf(f)"
            :min="f.min"
            :max="f.max"
            :step="f.step"
            :nullable="f.type === 'target'"
            :placeholder="f.type === 'target' ? 'none' : undefined"
            :aria-label="f.label"
            @update:model-value="(v) => $emit('change', f, v)"
          />
          <span v-if="f.unit" class="text-sm text-muted-foreground">{{ f.unit }}</span>
        </template>
      </div>

      <p class="text-sm text-muted-foreground" :class="f.type === 'bands' ? 'md:col-span-2 md:col-start-2' : ''">{{ f.description }}</p>
    </div>
  </SectionCard>
</template>

<script setup>
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import NumberInput from '@/components/common/NumberInput.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import { getPath } from '@/lib/settings.js'
import BandsEditor from '@/components/display/BandsEditor.vue'

const props = defineProps({ group: { type: Object, required: true }, draft: { type: Object, required: true } })
defineEmits(['change'])

const valueOf = (field) => getPath(props.draft, field.path)
</script>
