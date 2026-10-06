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
  values: { type: Object, required: true },
  label: { type: String, default: 'Value' },
  referenceValues: { type: Object, default: null },
  referenceLabel: { type: String, default: 'Cohort' },
})

const canvasRef = ref(null)
let chart = null

const series = (values) => DIMENSIONS.map((d) => values?.[d] ?? null)

function datasets() {
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
watch(() => [props.values, props.referenceValues, props.label, props.referenceLabel], render, { deep: true })
</script>
