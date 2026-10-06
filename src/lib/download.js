const escapeHtml = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// A standalone HTML page, so a sheet can be saved and opened without the app.
export const htmlDocument = (title, bodyHtml, css) =>
  `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${css}</style></head><body>${bodyHtml}</body></html>\n`

// The page's current CSS rules as text (browser only).
export function pageCss() {
  let css = ''
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) css += `${rule.cssText}\n`
    } catch {
      // A cross-origin sheet cannot be read; skip it.
    }
  }
  return css
}

// Saves text as a file through the browser (browser only).
export function downloadText(fileName, text, type = 'text/html;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
