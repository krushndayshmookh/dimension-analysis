const isMissing = (v) => v == null || !Number.isFinite(Number(v))

export const formatNumber = (v, decimals = 1) => (isMissing(v) ? '—' : Number(v).toFixed(decimals).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1'))
export const formatPct = (v, decimals = 1) => (isMissing(v) ? '—' : `${formatNumber(v, decimals)}%`)
export const formatSigned = (v, suffix = '', decimals = 1) =>
  isMissing(v) ? '—' : `${Number(v) > 0 ? '+' : ''}${formatNumber(v, decimals)}${suffix}`

export const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

export const clampPct = (v) => (isMissing(v) ? 0 : Math.max(0, Math.min(100, Number(v))))
