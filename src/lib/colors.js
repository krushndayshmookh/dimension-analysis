
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
