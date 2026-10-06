<template>
  <div class="chart-container"><canvas ref="canvasRef"></canvas></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Chart from 'chart.js/auto'

// points: [{ x, y, label, color? }]. With `diagonal`, a dashed y = x line is drawn.
const props = defineProps({
  points: { type: Array, required: true },
  xLabel: { type: String, required: true },
  yLabel: { type: String, required: true },
  xMin: { type: Number, default: 0 },
  xMax: { type: Number, default: 100 },
  yMin: { type: Number, default: 0 },
  yMax: { type: Number, default: 100 },
  diagonal: { type: Boolean, default: false },
})

const canvasRef = ref(null)
let chart = null

function render() {
  chart?.destroy()
  const datasets = [
    {
      type: 'scatter',
      label: 'Questions',
      data: props.points.map((p) => ({ x: p.x, y: p.y })),
      backgroundColor: props.points.map((p) => p.color ?? '#2563eb'),
      pointRadius: 6,
      pointHoverRadius: 8,
    },
  ]
  if (props.diagonal) {
    datasets.push({
      type: 'line',
      label: 'Actual = expected',
      data: [{ x: props.xMin, y: props.xMin }, { x: props.xMax, y: props.xMax }],
      borderColor: '#94a3b8',
      borderDash: [6, 4],
      pointRadius: 0,
      borderWidth: 1,
    })
  }
  chart = new Chart(canvasRef.value, {
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { type: 'linear', min: props.xMin, max: props.xMax, title: { display: true, text: props.xLabel } },
        y: { type: 'linear', min: props.yMin, max: props.yMax, title: { display: true, text: props.yLabel } },
      },
      plugins: {
        legend: { display: props.diagonal },
        tooltip: {
          filter: (item) => item.datasetIndex === 0,
          callbacks: {
            label: (ctx) => {
              const p = props.points[ctx.dataIndex]
              return `${p.label}: ${props.xLabel} ${ctx.parsed.x}, ${props.yLabel} ${ctx.parsed.y}`
            },
          },
        },
      },
    },
  })
}

onMounted(render)
onBeforeUnmount(() => chart?.destroy())
watch(() => [props.points, props.xLabel, props.yLabel], render, { deep: true })
</script>
