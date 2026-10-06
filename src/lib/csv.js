import Papa from 'papaparse'

// Resolves with Papa's result ({ data, errors, meta }). Header names are
// trimmed; blank lines are skipped. The delimiter is always a comma.
export const parseCsv = (fileOrString) =>
  new Promise((resolve, reject) => {
    Papa.parse(fileOrString, {
      header: true,
      delimiter: ',',
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
      complete: resolve,
      error: reject,
    })
  })
