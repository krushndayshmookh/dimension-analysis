<template>
  <div class="chart-container"><canvas ref="canvasRef"></canvas></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Chart from 'chart.js/auto'

// series: [{ label, data: [number|null], color }]
const props = defineProps({
  labels: { type: Array, required: true },
  series: { type: Array, required: true },
  yLabel: { type: String, default: '' },
  yMin: { type: Number, default: 0 },
  yMax: { type: Number, default: 100 },
})

const canvasRef = ref(null)
let chart = null

function render() {
  chart?.destroy()
  chart = new Chart(canvasRef.value, {
    type: 'line',
    data: {
      labels: props.labels,
      datasets: props.series.map((s) => ({
        label: s.label,
        data: s.data,
        borderColor: s.color,
        backgroundColor: s.color,
        pointRadius: 3,
        tension: 0.15,
        spanGaps: false,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { min: props.yMin, max: props.yMax, title: { display: Boolean(props.yLabel), text: props.yLabel } } },
      plugins: { legend: { position: 'top' } },
    },
  })
}

onMounted(render)
onBeforeUnmount(() => chart?.destroy())
watch(() => [props.labels, props.series], render, { deep: true })
</script>
