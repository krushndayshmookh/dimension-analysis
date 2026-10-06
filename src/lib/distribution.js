import { highestFirst } from './stats.js'
import { formatPct as pct } from './format.js'

// Rows for a distribution table, highest range first. dist has decileBins and
// markBins; studentById maps an id to a profile; valueOf renders the number shown
// next to a student's name.
export function distributionRows(dist, mode, studentById, valueOf) {
  const bins = highestFirst(mode === 'percentage' ? dist.decileBins : dist.markBins)
  return bins.map((b) => ({
    label: b.label,
    count: b.count,
    percentage: b.percentage,
    students: b.studentIds.map((id) => {
      const s = studentById.get(id)
      return { id, label: `${s.name} (${valueOf(s)})` }
    }),
  }))
}

export const distributionColumns = (mode) => [
  { key: 'label', label: mode === 'percentage' ? 'Range (%)' : 'Range (marks)', type: 'text' },
  { key: 'count', label: 'Students', type: 'number' },
  { key: 'percentage', label: '% of cohort', type: 'number', format: (v) => pct(v) },
  { key: 'bar', label: 'Distribution', type: 'number', value: (r) => r.percentage, filterable: false, sortable: false, exportable: false },
  { key: 'students', label: 'Who', type: 'text', value: (r) => r.students.map((s) => s.label).join(', ') },
]
