import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createApp } from '../server/server.js'
import { addUser, removeUser, setPassword, userDataDir } from '../server/auth.js'
import { startServer, PASSWORD } from './http.js'

let dataDir
let server
let base

beforeEach(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dimension-analysis-auth-'))
  await addUser(dataDir, 'ana', PASSWORD)
  await addUser(dataDir, 'ben', 'another long password')
  server = createApp({ dataDir }).listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve))
  fs.rmSync(dataDir, { recursive: true, force: true })
})

const json = (method, body, headers = {}) => ({ method, headers: { 'Content-Type': 'application/json', ...headers }, body: body && JSON.stringify(body) })
const login = (username, password) => fetch(`${base}/api/auth/login`, json('POST', { username, password }))
const cookieOf = (res) => res.headers.get('set-cookie').split(';')[0]
const signIn = async (username, password) => cookieOf(await login(username, password))
const COHORT = { name: 'Batch', students: [{ id: 'S1', name: 'One' }] }

describe('signing in', () => {
  it('sets an http-only, same-site cookie and names the user', async () => {
    const res = await login('ana', PASSWORD)
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { username: 'ana' })
    const header = res.headers.get('set-cookie')
    assert.match(header, /HttpOnly/)
    assert.match(header, /SameSite=Strict/)
    const me = await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookieOf(res) } })
    assert.deepEqual(await me.json(), { username: 'ana' })
  })

  it('treats usernames case-insensitively but rejects wrong passwords and unknown users alike', async () => {
    assert.equal((await login('ANA', PASSWORD)).status, 200)
    const wrong = await login('ana', 'nope nope nope')
    const unknown = await login('nobody', PASSWORD)
    assert.equal(wrong.status, 401)
    assert.equal(unknown.status, 401)
    assert.deepEqual(await wrong.json(), await unknown.json())
  })

  it('rejects malformed login bodies and names that look like object keys', async () => {
    assert.equal((await login(undefined, undefined)).status, 400)
    assert.equal((await login({ $ne: 1 }, PASSWORD)).status, 400)
    for (const name of ['__proto__', 'constructor', '../ana', '']) assert.equal((await login(name, PASSWORD)).status, 401)
  })

  it('locks out repeated failures', async () => {
    for (let i = 0; i < 8; i++) assert.equal((await login('ana', 'wrong password')).status, 401)
    assert.equal((await login('ana', PASSWORD)).status, 429)
  })

  it('signs out by clearing the cookie', async () => {
    const res = await fetch(`${base}/api/auth/logout`, json('POST'))
    assert.match(res.headers.get('set-cookie'), /Max-Age=0/)
  })
})

describe('without a session', () => {
  const routes = [
    ['GET', '/api/exams'], ['GET', '/api/exams/x'], ['POST', '/api/exams'], ['DELETE', '/api/exams/x'],
    ['GET', '/api/cohorts'], ['GET', '/api/cohorts/x'], ['POST', '/api/cohorts'], ['PUT', '/api/cohorts/x'], ['DELETE', '/api/cohorts/x'],
    ['GET', '/api/students'], ['GET', '/api/students/x/history'],
    ['GET', '/api/settings'], ['PUT', '/api/settings'], ['GET', '/api/backup'], ['POST', '/api/restore'], ['GET', '/api/anything-else'],
  ]

  it('refuses every data route', async () => {
    for (const [method, url] of routes) {
      const res = await fetch(`${base}${url}`, json(method, method === 'GET' ? undefined : {}))
      assert.equal(res.status, 401, `${method} ${url}`)
    }
  })

  it('refuses forged, tampered, expired and stale cookies', async () => {
    const good = await signIn('ana', PASSWORD)
    const [name, value] = good.split('=')
    const [body, signature] = value.split('.')
    const forge = (claims, sig = signature) => `${name}=${Buffer.from(JSON.stringify(claims)).toString('base64url')}.${sig}`
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString())
    const attempts = [
      `${name}=${body}.${signature.slice(0, -2)}xx`,
      forge({ ...claims, u: 'ben' }),
      forge({ ...claims, exp: 1 }),
      `${name}=${body}`,
      `${name}=garbage`,
    ]
    for (const cookie of attempts) assert.equal((await fetch(`${base}/api/exams`, { headers: { Cookie: cookie } })).status, 401, cookie)
    assert.equal((await fetch(`${base}/api/exams`, { headers: { Cookie: good } })).status, 200)
  })

  it('does not read a large request body before checking the session', async () => {
    const res = await fetch(`${base}/api/restore`, json('POST', { padding: 'x'.repeat(5_000_000) }))
    assert.equal(res.status, 401)
  })

  it('stops working when the account is removed or its password changes', async () => {
    const cookie = await signIn('ana', PASSWORD)
    await setPassword(dataDir, 'ana', 'a brand new password')
    assert.equal((await fetch(`${base}/api/exams`, { headers: { Cookie: cookie } })).status, 401)
    const fresh = await signIn('ana', 'a brand new password')
    assert.equal((await fetch(`${base}/api/exams`, { headers: { Cookie: fresh } })).status, 200)
    removeUser(dataDir, 'ana')
    assert.equal((await fetch(`${base}/api/exams`, { headers: { Cookie: fresh } })).status, 401)
  })
})

describe('separate accounts', () => {
  it('keeps each user’s cohorts, settings and backups to themselves', async () => {
    const ana = await signIn('ana', PASSWORD)
    const ben = await signIn('ben', 'another long password')
    const as = (cookie) => (method, url, body) => fetch(`${base}${url}`, json(method, body, { Cookie: cookie }))
    const forAna = as(ana)
    const forBen = as(ben)

    const created = await forAna('POST', '/api/cohorts', COHORT)
    assert.equal(created.status, 201)
    const { id } = await created.json()
    await forAna('PUT', '/api/settings', { mastery: { weakBelow: 45 } })

    assert.deepEqual(await (await forBen('GET', '/api/cohorts')).json(), [])
    assert.equal((await forBen('GET', `/api/cohorts/${id}`)).status, 404)
    assert.equal((await forBen('DELETE', `/api/cohorts/${id}`)).status, 404)
    assert.deepEqual(await (await forBen('GET', '/api/settings')).json(), {})
    assert.deepEqual((await (await forBen('GET', '/api/backup')).json()).cohorts, [])
    assert.equal((await (await forBen('GET', '/api/students')).json()).length, 0)

    assert.equal((await (await forAna('GET', '/api/cohorts')).json()).length, 1)
    assert.deepEqual(await (await forAna('GET', '/api/settings')).json(), { mastery: { weakBelow: 45 } })
    assert.ok(fs.existsSync(userDataDir(dataDir, 'ana')))
    assert.deepEqual(fs.readdirSync(path.join(dataDir, 'users')).sort(), ['ana', 'ben'])
  })

  it('does not let an id climb out of the user folder', async () => {
    const ana = await signIn('ana', PASSWORD)
    const ben = await signIn('ben', 'another long password')
    await fetch(`${base}/api/settings`, json('PUT', { secret: 'ben-only' }, { Cookie: ben }))
    for (const probe of ['..%2F..%2Fben%2Fsettings', '..%2F..%2F..%2Fauth%2Fusers', '%2e%2e%2f%2e%2e%2fben%2Fsettings']) {
      for (const kind of ['exams', 'cohorts', 'students']) {
        const res = await fetch(`${base}/api/${kind}/${probe}${kind === 'students' ? '/history' : ''}`, { headers: { Cookie: ana } })
        assert.ok([400, 404].includes(res.status), `${kind}/${probe} gave ${res.status}`)
        assert.ok(!(await res.text()).includes('ben-only'))
      }
    }
  })
})

describe('cross-site requests', () => {
  it('refuses a state-changing request from another origin', async () => {
    const cookie = await signIn('ana', PASSWORD)
    const res = await fetch(`${base}/api/settings`, json('PUT', { x: 1 }, { Cookie: cookie, Origin: 'https://evil.example' }))
    assert.equal(res.status, 403)
  })

  it('accepts one from its own origin', async () => {
    const cookie = await signIn('ana', PASSWORD)
    const res = await fetch(`${base}/api/settings`, json('PUT', { x: 1 }, { Cookie: cookie, Origin: base }))
    assert.equal(res.status, 200)
  })
})

describe('responses', () => {
  it('are never cached and carry hardening headers', async () => {
    const res = await fetch(`${base}/api/exams`)
    assert.equal(res.headers.get('cache-control'), 'no-store')
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(res.headers.get('x-frame-options'), 'DENY')
    assert.equal(res.headers.get('x-powered-by'), null)
  })
})

describe('account rules', () => {
  it('validates usernames and password length, and refuses duplicates', async () => {
    await assert.rejects(addUser(dataDir, '../x', PASSWORD), /Usernames/)
    await assert.rejects(addUser(dataDir, 'Ana', PASSWORD), /Usernames/)
    await assert.rejects(addUser(dataDir, 'cara', 'short'), /at least/)
    await assert.rejects(addUser(dataDir, 'ana', PASSWORD), /already exists/)
  })

  it('stores only hashes', () => {
    const stored = fs.readFileSync(path.join(dataDir, 'auth', 'users.json'), 'utf8')
    assert.ok(!stored.includes(PASSWORD))
    assert.match(stored, /scrypt\$/)
  })
})

describe('startServer helper', () => {
  it('gives a signed-in client', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dimension-analysis-helper-'))
    const app = await startServer(dir)
    try {
      assert.equal((await app.fetch(`${app.base}/api/exams`)).status, 200)
      assert.equal((await fetch(`${app.base}/api/exams`)).status, 401)
    } finally {
      await app.close()
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
