
// One color per dimension, used for badges, bars and chart labels. Keep in
// step with the .badge-dim-* rules in style.css.
export const DIMENSION_COLORS = {
  Recall: '#2563eb',
  Comprehend: '#0891b2',
  Solve: '#16a34a',
  Build: '#d97706',
  Evaluate: '#7c3aed',
}

export const dimensionColor = (dimension) => DIMENSION_COLORS[dimension] ?? '#64748b'


// CSS class for a dimension badge.
export const dimensionClass = (dimension) => `badge-dim-${String(dimension).toLowerCase()}`

// Diverging scale for a correlation coefficient from -1 to +1. Positive values
// run through yellow, green and teal to navy and negative ones through orange to
// red, so neighbouring strengths look different, not like shades of one hue.
const STOPS = [
  [-1, '#991b1b'],
  [-0.6, '#dc2626'],
  [-0.25, '#fb923c'],
  [0, '#f8fafc'],
  [0.25, '#fde68a'],
  [0.5, '#4ade80'],
  [0.75, '#0d9488'],
  [1, '#1e3a8a'],
]

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const toHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`

// { background, text } for a coefficient, or null when there is none.
export function correlationColor(r) {
  if (r == null || !Number.isFinite(r)) return null
  const x = Math.max(-1, Math.min(1, r))
  const upper = STOPS.findIndex(([at]) => at >= x)
  const [fromAt, fromHex] = STOPS[Math.max(0, upper - 1)]
  const [toAt, toHexStop] = STOPS[Math.max(1, upper)]
  const t = toAt === fromAt ? 0 : (x - fromAt) / (toAt - fromAt)
  const a = toRgb(fromHex)
  const b = toRgb(toHexStop)
  const rgb = a.map((v, i) => v + (b[i] - v) * t)
  const luminance = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]
  return { background: toHex(rgb), text: luminance < 140 ? '#ffffff' : '#0f172a' }
}

export const CORRELATION_GRADIENT = `linear-gradient(to right, ${STOPS.map(([at, hex]) => `${hex} ${Math.round(((at + 1) / 2) * 100)}%`).join(', ')})`
