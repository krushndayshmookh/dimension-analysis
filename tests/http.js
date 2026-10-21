import { createApp } from '../server/server.js'
import { addUser, userDataDir } from '../server/auth.js'

export const PASSWORD = 'correct horse battery'

// Starts the app on a free port with a signed-in account. `fetch` is the global
// fetch with that account's session cookie added; `userDir` is where its data lives.
export async function startServer(dataDir, username = 'tester') {
  await addUser(dataDir, username, PASSWORD)
  const server = createApp({ dataDir }).listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: PASSWORD }),
  })
  const cookie = login.headers.get('set-cookie').split(';')[0]
  return {
    base,
    userDir: userDataDir(dataDir, username),
    fetch: (url, options = {}) => fetch(url, { ...options, headers: { ...options.headers, Cookie: cookie } }),
    close: () => new Promise((resolve) => server.close(resolve)),
  }
}
