<template>
  <div class="relative w-full" :class="heightClass"><canvas ref="canvasRef"></canvas></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Chart from 'chart.js/auto'

// Grouped bars, one group per label. series: [{ label, data: [number|null], color }]
const props = defineProps({
  labels: { type: Array, required: true },
  series: { type: Array, required: true },
  yLabel: { type: String, default: '' },
  yMin: { type: Number, default: 0 },
  yMax: { type: Number, default: 100 },
  // Tailwind height class of the chart area.
  heightClass: { type: String, default: 'h-72' },
})

const canvasRef = ref(null)
let chart = null

function render() {
  chart?.destroy()
  chart = new Chart(canvasRef.value, {
    type: 'bar',
    data: {
      labels: props.labels,
      datasets: props.series.map((s) => ({
        label: s.label,
        data: s.data,
        backgroundColor: s.color,
        borderRadius: 2,
        // Thin bars: each group fills only part of its slot and a bar never exceeds this width.
        categoryPercentage: 0.6,
        barPercentage: 0.8,
        maxBarThickness: 14,
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
// Redraw only when the plotted values change, not when a parent re-renders with equal arrays.
watch(() => JSON.stringify([props.labels, props.series, props.yLabel, props.yMin, props.yMax]), render)
</script>
