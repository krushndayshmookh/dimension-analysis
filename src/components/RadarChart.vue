<template>
  <div class="radar-chart-container">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Chart from 'chart.js/auto'
import { DIMENSIONS } from '../lib/constants.js'
import { dimensionColor } from '../lib/colors.js'

// values / referenceValues: { [dimension]: percentage | null }
const props = defineProps({
  values: { type: Object, default: () => ({}) },
  label: { type: String, default: 'Value' },
  referenceValues: { type: Object, default: null },
  referenceLabel: { type: String, default: 'Cohort' },
  // Several series instead of values/referenceValues: [{ label, values, color }].
  series: { type: Array, default: null },
})

const canvasRef = ref(null)
let chart = null

const series = (values) => DIMENSIONS.map((d) => values?.[d] ?? null)

function datasets() {
  if (props.series) {
    return props.series.map((s) => ({
      label: s.label,
      data: series(s.values),
      backgroundColor: `${s.color}22`,
      borderColor: s.color,
      pointBackgroundColor: s.color,
      borderWidth: 2,
      borderDash: s.dashed ? [5, 5] : [],
      spanGaps: false,
    }))
  }
  const list = [
    {
      label: props.label,
      data: series(props.values),
      backgroundColor: 'rgba(37, 99, 235, 0.2)',
      borderColor: 'rgb(37, 99, 235)',
      pointBackgroundColor: 'rgb(37, 99, 235)',
      borderWidth: 2,
      spanGaps: false,
    },
  ]
  if (props.referenceValues) {
    list.push({
      label: props.referenceLabel,
      data: series(props.referenceValues),
      backgroundColor: 'rgba(100, 116, 139, 0.12)',
      borderColor: 'rgb(100, 116, 139)',
      pointBackgroundColor: 'rgb(100, 116, 139)',
      borderWidth: 2,
      borderDash: [5, 5],
      spanGaps: false,
    })
  }
  return list
}

function render() {
  if (chart) chart.destroy()
  chart = new Chart(canvasRef.value, {
    type: 'radar',
    data: { labels: DIMENSIONS, datasets: datasets() },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { stepSize: 20, backdropColor: 'transparent', callback: (v) => `${v}%` },
          pointLabels: { color: DIMENSIONS.map(dimensionColor), font: { weight: 'bold', size: 13 } },
        },
      },
      plugins: {
        legend: { position: 'top' },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw == null ? '—' : `${ctx.raw}%`}` } },
      },
    },
  })
}

onMounted(render)
onBeforeUnmount(() => chart?.destroy())
// Redraw only when the plotted values change, not when a parent re-renders with equal objects.
watch(() => JSON.stringify([props.values, props.referenceValues, props.label, props.referenceLabel, props.series]), render)
</script>
