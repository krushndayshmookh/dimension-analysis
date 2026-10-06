<template>
  <SectionCard title="Dimension × difficulty">
    <template #actions>
      <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
        Cell shading: 0%
        <span class="inline-block h-2.5 w-24 rounded border" style="background: linear-gradient(to right, rgba(37, 99, 235, 0.08), rgba(37, 99, 235, 0.58))"></span>
        100% mean mastery
      </span>
    </template>
    <div class="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dimension</TableHead>
            <TableHead v-for="t in matrix.difficulties" :key="t" class="text-center capitalize">{{ t }}</TableHead>
            <TableHead class="text-center">All tiers</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="d in matrix.dimensions" :key="d">
            <TableCell><DimensionBadge :dimension="d" /></TableCell>
            <TableCell v-for="t in matrix.difficulties" :key="t" class="min-w-28 text-center" :style="heat(matrix.cells[d][t].masteryPct)" :title="cellTitle(matrix.cells[d][t])">
              <MatrixCell :cell="matrix.cells[d][t]" />
            </TableCell>
            <TableCell class="min-w-28 text-center font-medium" :style="heat(matrix.rowTotals[d].masteryPct)" :title="cellTitle(matrix.rowTotals[d])">
              <MatrixCell :cell="matrix.rowTotals[d]" />
            </TableCell>
          </TableRow>
          <TableRow class="border-t-2 font-semibold">
            <TableCell>All dimensions</TableCell>
            <TableCell v-for="t in matrix.difficulties" :key="t" class="text-center" :style="heat(matrix.colTotals[t].masteryPct)" :title="cellTitle(matrix.colTotals[t])">
              <MatrixCell :cell="matrix.colTotals[t]" />
            </TableCell>
            <TableCell class="text-center" :style="heat(matrix.grandTotal.masteryPct)">
              <MatrixCell :cell="matrix.grandTotal" />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
    <p class="text-xs text-muted-foreground">Marks of a multi-dimension question are split equally across its dimensions.</p>
  </SectionCard>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { computed, defineComponent, h } from 'vue'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import DimensionBadge from '@/components/common/DimensionBadge.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import { clampPct, formatNumber as num, formatPct as pct } from '@/lib/format.js'
import { useSessionStore } from '@/stores/session.js'

const sessionStore = useSessionStore()
const { paper } = storeToRefs(sessionStore)
const matrix = computed(() => paper.value.matrix)

// Single-hue shading: stronger blue for higher mean mastery.
const heat = (masteryPct) =>
  masteryPct == null ? {} : { backgroundColor: `rgba(37, 99, 235, ${(0.08 + 0.5 * (clampPct(masteryPct) / 100)).toFixed(3)})` }

const cellTitle = (c) =>
  c.availableMarks > 0 ? `${num(c.meanEarned, 2)} of ${num(c.availableMarks, 2)} marks on average across ${c.questionCount} question(s)` : 'No questions'

const MatrixCell = defineComponent({
  props: { cell: Object },
  setup: (props) => () =>
    props.cell.availableMarks > 0
      ? [
          h('div', { class: 'font-semibold' }, pct(props.cell.masteryPct)),
          h('div', { class: 'text-xs text-muted-foreground' }, `${num(props.cell.availableMarks)} marks · ${props.cell.questionCount} Q`),
        ]
      : h('span', { class: 'text-muted-foreground' }, '—'),
})
</script>
