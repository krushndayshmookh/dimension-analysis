<template>
  <svg class="radar-svg" :viewBox="`0 0 ${size} ${size}`" role="img" aria-label="Mastery by dimension">
    <g fill="none" stroke="#cbd5e1" stroke-width="1">
      <polygon v-for="ring in RINGS" :key="ring" :points="ringPoints(ring)" />
      <line v-for="(d, i) in DIMENSIONS" :key="d" :x1="c" :y1="c" :x2="point(i, 100).x" :y2="point(i, 100).y" />
    </g>
    <text v-for="ring in [20, 60, 100]" :key="`t${ring}`" :x="c + 3" :y="c - (R * ring) / 100 - 2" font-size="8" fill="#94a3b8">{{ ring }}%</text>
    <polygon v-if="reference" :points="valuePoints(reference)" fill="rgba(100,116,139,0.10)" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4 3" />
    <polygon :points="valuePoints(values)" fill="rgba(37,99,235,0.22)" stroke="#2563eb" stroke-width="2" />
    <text
      v-for="(d, i) in DIMENSIONS"
      :key="d"
      :x="point(i, 100, 15).x"
      :y="point(i, 100, 15).y"
      text-anchor="middle"
      dominant-baseline="middle"
      font-size="11"
      font-weight="700"
      :fill="dimensionColor(d)"
    >{{ d }}</text>
  </svg>
</template>

<script setup>
import { DIMENSIONS } from '@/lib/constants.js'
import { dimensionColor } from '@/lib/colors.js'

// A light, print-friendly radar (plain SVG, no canvas). values / reference:
// { [dimension]: percentage | null }.
defineProps({
  values: { type: Object, required: true },
  reference: { type: Object, default: null },
})

const size = 300
const c = size / 2
const R = 88
const RINGS = [20, 40, 60, 80, 100]

const point = (index, pct, extra = 0) => {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / DIMENSIONS.length
  const radius = (R * pct) / 100 + extra
  return { x: c + radius * Math.cos(angle), y: c + radius * Math.sin(angle) }
}
const toPoints = (pcts) => pcts.map((p, i) => `${point(i, p).x.toFixed(1)},${point(i, p).y.toFixed(1)}`).join(' ')
const ringPoints = (ring) => toPoints(DIMENSIONS.map(() => ring))
const valuePoints = (values) => toPoints(DIMENSIONS.map((d) => Math.max(0, Math.min(100, values?.[d] ?? 0))))
</script>
