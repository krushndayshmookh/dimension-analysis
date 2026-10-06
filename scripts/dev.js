import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'

// Runs the storage server and the Vite dev server together.
const require = createRequire(import.meta.url)
const viteBin = path.join(path.dirname(require.resolve('vite/package.json')), 'bin', 'vite.js')

const children = [
  spawn(process.execPath, ['server/server.js'], { stdio: 'inherit' }),
  spawn(process.execPath, [viteBin], { stdio: 'inherit' }),
]

const stop = (code = 0) => {
  for (const child of children) child.kill()
  process.exit(code)
}

process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
for (const child of children) {
  child.on('exit', (code) => {
    if (code) stop(code)
  })
}
