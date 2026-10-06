<template>
  <Badge variant="secondary" class="capitalize">{{ tier }}</Badge>
</template>

<script setup>
import { Badge } from '@/components/ui/badge'

defineProps({ tier: { type: String, required: true } })
</script>
