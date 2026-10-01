import { spawn } from 'node:child_process'

// Spawn server process
const server = spawn('node', ['server/server.js'], {
  stdio: 'inherit',
  shell: true,
})

// Spawn client dev server
const client = spawn('npx', ['vite'], {
  stdio: 'inherit',
  shell: true,
})

const cleanup = (code = 0) => {
  try {
    server.kill()
  } catch {}
  try {
    client.kill()
  } catch {}
  process.exit(code)
}

process.on('SIGINT', () => cleanup(0))
process.on('SIGTERM', () => cleanup(0))

server.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    cleanup(code)
  }
})

client.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    cleanup(code)
  }
})
