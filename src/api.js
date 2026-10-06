// Thin wrapper over the local storage server. Every call throws an Error with
// the server's message when the request fails.
async function request(url, options) {
  let response
  try {
    response = await fetch(url, options)
  } catch {
    throw new Error('The storage server is not reachable. Start it with "npm run dev" or "npm run server".')
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `Request failed (${response.status})`)
  }
  return response.json()
}

const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const listExams = () => request('/api/exams')
export const getExam = (id) => request(`/api/exams/${encodeURIComponent(id)}`)
export const saveExam = (payload) => request('/api/exams', json('POST', payload))
export const deleteExam = (id) => request(`/api/exams/${encodeURIComponent(id)}`, { method: 'DELETE' })
export const listCohorts = () => request('/api/cohorts')
export const getCohort = (id) => request(`/api/cohorts/${encodeURIComponent(id)}`)
export const createCohort = (payload) => request('/api/cohorts', json('POST', payload))
export const updateCohort = (id, payload) => request(`/api/cohorts/${encodeURIComponent(id)}`, json('PUT', payload))
export const deleteCohort = (id) => request(`/api/cohorts/${encodeURIComponent(id)}`, { method: 'DELETE' })
export const listStudents = () => request('/api/students')
export const getStudentHistory = (id) => request(`/api/students/${encodeURIComponent(id)}/history`)
export const getSettings = () => request('/api/settings')
export const saveSettings = (settings) => request('/api/settings', json('PUT', settings))
export const getBackup = () => request('/api/backup')
export const restoreBackup = (backup) => request('/api/restore', json('POST', backup))
