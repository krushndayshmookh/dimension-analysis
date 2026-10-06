// Filtering behind the student sidebar. Items are { id, name, section }.
export const NO_SECTION = '__none__'

export function filterStudentItems(items, { query = '', section = '' } = {}) {
  const q = query.trim().toLowerCase()
  return items.filter((item) => {
    if (section === NO_SECTION && item.section != null) return false
    if (section && section !== NO_SECTION && item.section !== section) return false
    return !q || item.name.toLowerCase().includes(q) || String(item.id).toLowerCase().includes(q)
  })
}

// The sections present, sorted naturally, and whether some students have none.
// With no sections at all there is nothing to filter by.
export function sectionOptions(items) {
  const sections = [...new Set(items.map((i) => i.section).filter((s) => s != null))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  )
  return { sections, hasUnassigned: sections.length > 0 && items.some((i) => i.section == null) }
}
