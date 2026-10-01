<template>
  <div class="radar-chart-container">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Chart from 'chart.js/auto'

const props = defineProps({
  studentData: {
    type: [Object, Array],
    required: true,
    default: () => ({})
  },
  cohortData: {
    type: [Object, Array, null],
    default: null
  },
  metricName: {
    type: String,
    default: 'Overall Mastery %'
  },
  studentLabel: {
    type: String,
    default: 'Student'
  }
})

const canvasRef = ref(null)
let chartInstance = null

const DIMENSIONS = ['Recall', 'Comprehend', 'Solve', 'Build', 'Evaluate']

function extractValues(data) {
  if (!data) return [0, 0, 0, 0, 0]
  if (Array.isArray(data)) {
    return data.slice(0, 5).map((v) => (Number.isFinite(Number(v)) ? Number(v) : 0))
  }
  return DIMENSIONS.map((dim) => {
    const val = data[dim] ?? data[dim.toLowerCase()] ?? data[dim.toUpperCase()]
    if (typeof val === 'object' && val !== null) {
      const num = props.metricName.toLowerCase().includes('accuracy')
        ? (val.accuracy ?? val.pct ?? 0)
        : (val.pct ?? val.accuracy ?? 0)
      return Number.isFinite(Number(num)) ? Number(num) : 0
    }
    return Number.isFinite(Number(val)) ? Number(val) : 0
  })
}

function buildDatasets() {
  const datasets = [
    {
      label: `${props.studentLabel} (${props.metricName})`,
      data: extractValues(props.studentData),
      backgroundColor: 'rgba(54, 162, 235, 0.25)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 2,
      pointBackgroundColor: 'rgba(54, 162, 235, 1)',
      pointBorderColor: '#ffffff',
      pointHoverBackgroundColor: '#ffffff',
      pointHoverBorderColor: 'rgba(54, 162, 235, 1)',
      pointRadius: 4,
      pointHoverRadius: 6,
      fill: true
    }
  ]

  if (props.cohortData) {
    datasets.push({
      label: `Cohort Average (${props.metricName})`,
      data: extractValues(props.cohortData),
      backgroundColor: 'rgba(255, 99, 132, 0.15)',
      borderColor: 'rgba(255, 99, 132, 0.9)',
      borderWidth: 2,
      borderDash: [5, 5],
      pointBackgroundColor: 'rgba(255, 99, 132, 1)',
      pointBorderColor: '#ffffff',
      pointHoverBackgroundColor: '#ffffff',
      pointHoverBorderColor: 'rgba(255, 99, 132, 1)',
      pointRadius: 4,
      pointHoverRadius: 6,
      fill: true
    })
  }

  return datasets
}

function initChart() {
  if (!canvasRef.value) return
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }

  chartInstance = new Chart(canvasRef.value, {
    type: 'radar',
    data: {
      labels: DIMENSIONS,
      datasets: buildDatasets()
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            backdropColor: 'transparent',
            callback: (value) => `${value}%`
          },
          pointLabels: {
            font: {
              size: 13,
              weight: '600'
            },
            color: '#2c3e50'
          },
          grid: {
            color: '#e2e8f0'
          },
          angleLines: {
            color: '#cbd5e1'
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 14,
            font: { size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw}%`
          }
        }
      }
    }
  })
}

function updateChart() {
  if (!chartInstance) {
    initChart()
    return
  }
  chartInstance.data.datasets = buildDatasets()
  chartInstance.update()
}

onMounted(() => {
  initChart()
})

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})

watch(
  () => [props.studentData, props.cohortData, props.metricName, props.studentLabel],
  () => {
    updateChart()
  },
  { deep: true }
)
</script>
