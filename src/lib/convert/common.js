import Papa from 'papaparse'

// Ids in the analytics sheets carry thousands separators ("1,698,982").
export const cleanId = (value) => String(value ?? '').replace(/[,\s]/g, '')

// A row with lower-cased, trimmed keys and trimmed values, so columns can be
// looked up without caring about case.
export function lowerRow(row) {
  const out = {}
  for (const [key, value] of Object.entries(row ?? {})) out[String(key).trim().toLowerCase()] = String(value ?? '').trim()
  return out
}

export const toCsv = (rows, columns) =>
  `${Papa.unparse({ fields: columns, data: rows.map((row) => columns.map((c) => row[c] ?? '')) }, { newline: '\n' })}\n`

export const issue = (level, text) => ({ level, text })

