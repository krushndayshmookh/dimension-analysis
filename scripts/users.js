import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { addUser, setPassword, removeUser, readUsers, userDataDir, USERNAME_PATTERN, MIN_PASSWORD_LENGTH } from '../server/auth.js'
import { DEFAULT_DATA_DIR } from '../server/storage.js'

// Manages who can sign in. Run with: npm run users -- <command> [username]
const USAGE = `Usage: npm run users -- <command>
  add <username>             create an account (asks for a password)
  passwd <username>          change a password (signs that user out everywhere)
  remove <username>          delete the login; the user's data stays on disk
  list                       show the accounts
  import-legacy <username>   move data from the old single-user layout into this account`

const LEGACY = ['exams', 'students', 'cohorts', 'index.json', 'settings.json']

// One reader for all prompts (separate ones lose piped input). Typing is not echoed on a terminal.
let reader
const lines = []
let waiting = null
function ask(prompt) {
  if (!reader) {
    reader = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) })
    reader._writeToOutput = (text) => {
      if (!process.stdin.isTTY || text === prompt || text.includes('\n')) reader.output.write(text)
    }
    reader.on('line', (line) => (waiting ? waiting(line) : lines.push(line)))
    reader.on('close', () => waiting?.(''))
  }
  process.stdout.write(prompt)
  return new Promise((resolve) => {
    const done = (line) => {
      waiting = null
      if (process.stdin.isTTY) process.stdout.write('\n')
      resolve(line)
    }
    if (lines.length) done(lines.shift())
    else waiting = done
  })
}

async function askPassword() {
  const first = await ask('Password: ')
  if (first.length < MIN_PASSWORD_LENGTH) throw new Error(`Passwords need at least ${MIN_PASSWORD_LENGTH} characters`)
  if (first !== (await ask('Repeat password: '))) throw new Error('The passwords do not match')
  return first
}

function importLegacy(username) {
  if (!USERNAME_PATTERN.test(username)) throw new Error('Invalid username')
  if (!readUsers(DEFAULT_DATA_DIR)[username]) throw new Error(`User "${username}" does not exist; add it first`)
  const target = userDataDir(DEFAULT_DATA_DIR, username)
  const present = LEGACY.filter((name) => fs.existsSync(path.join(DEFAULT_DATA_DIR, name)))
  if (!present.length) throw new Error('No old-layout data found')
  const hasContent = (name) => fs.existsSync(path.join(target, name)) && fs.readdirSync(path.join(target, name)).length > 0
  if (['exams', 'students', 'cohorts'].some(hasContent) || fs.existsSync(path.join(target, 'settings.json'))) {
    throw new Error(`${target} already has data; refusing to overwrite`)
  }
  fs.mkdirSync(target, { recursive: true })
  for (const name of present) fs.renameSync(path.join(DEFAULT_DATA_DIR, name), path.join(target, name))
  console.log(`Moved ${present.join(', ')} to ${target}`)
}

const [command, username] = process.argv.slice(2)
try {
  if (command === 'add' && username) {
    await addUser(DEFAULT_DATA_DIR, username, await askPassword())
    console.log(`Added ${username}`)
  } else if (command === 'passwd' && username) {
    await setPassword(DEFAULT_DATA_DIR, username, await askPassword())
    console.log(`Changed the password for ${username}`)
  } else if (command === 'remove' && username) {
    removeUser(DEFAULT_DATA_DIR, username)
    console.log(`Removed ${username}; their data is still in ${userDataDir(DEFAULT_DATA_DIR, username)}`)
  } else if (command === 'list') {
    const names = Object.keys(readUsers(DEFAULT_DATA_DIR))
    console.log(names.length ? names.join('\n') : 'No users yet')
  } else if (command === 'import-legacy' && username) {
    importLegacy(username)
  } else {
    console.log(USAGE)
    process.exitCode = 1
  }
} catch (err) {
  console.error(err.message)
  process.exitCode = 1
}
reader?.close()
