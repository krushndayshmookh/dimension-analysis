import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { Router } from 'express'

const scrypt = promisify(crypto.scrypt)

// Accounts for the few instructors who use the app. Credentials live in
// <dataDir>/auth/users.json (scrypt hashes only); each user's data lives apart in
// <dataDir>/users/<username>/, and nothing outside that folder is ever reachable
// through the API.
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,31}$/
export const MIN_PASSWORD_LENGTH = 10

const COOKIE = 'da_session'
const SESSION_MS = 12 * 60 * 60 * 1000
const MAX_FAILURES = 8
const FAILURE_WINDOW_MS = 15 * 60 * 1000

const authDir = (dataDir) => path.join(dataDir, 'auth')
const usersFile = (dataDir) => path.join(authDir(dataDir), 'users.json')
const secretFile = (dataDir) => path.join(authDir(dataDir), 'secret')

export const userDataDir = (dataDir, username) => {
  if (!USERNAME_PATTERN.test(username)) throw new Error('Invalid username')
  return path.join(dataDir, 'users', username)
}

// ---- credentials ----------------------------------------------------------------

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const key = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`
}

async function verifyPassword(password, stored) {
  const [scheme, saltHex, keyHex] = String(stored).split('$')
  if (scheme !== 'scrypt' || !saltHex || !keyHex) return false
  const expected = Buffer.from(keyHex, 'hex')
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length)
  return crypto.timingSafeEqual(actual, expected)
}

// Compared against when the username is unknown, so a miss takes as long as a hit.
const DUMMY_HASH = await hashPassword(crypto.randomBytes(16).toString('hex'))

export function readUsers(dataDir) {
  try {
    return JSON.parse(fs.readFileSync(usersFile(dataDir), 'utf8'))
  } catch (err) {
    if (err.code === 'ENOENT') return {}
    throw err
  }
}

function writeUsers(dataDir, users) {
  fs.mkdirSync(authDir(dataDir), { recursive: true, mode: 0o700 })
  const temp = `${usersFile(dataDir)}.${process.pid}.tmp`
  fs.writeFileSync(temp, JSON.stringify(users, null, 2), { encoding: 'utf8', mode: 0o600 })
  fs.renameSync(temp, usersFile(dataDir))
}

function checkCredentials(username, password) {
  if (!USERNAME_PATTERN.test(username)) throw new Error('Usernames are 1–32 characters: lowercase letters, digits, dot, dash or underscore, starting with a letter or digit')
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) throw new Error(`Passwords need at least ${MIN_PASSWORD_LENGTH} characters`)
}

export async function addUser(dataDir, username, password) {
  checkCredentials(username, password)
  const users = readUsers(dataDir)
  if (users[username]) throw new Error(`User "${username}" already exists`)
  users[username] = { hash: await hashPassword(password), createdAt: new Date().toISOString() }
  writeUsers(dataDir, users)
}

export async function setPassword(dataDir, username, password) {
  checkCredentials(username, password)
  const users = readUsers(dataDir)
  if (!users[username]) throw new Error(`User "${username}" does not exist`)
  users[username] = { ...users[username], hash: await hashPassword(password) }
  writeUsers(dataDir, users)
}

// Removes the login only; the user's data folder is left in place.
export function removeUser(dataDir, username) {
  const users = readUsers(dataDir)
  if (!users[username]) throw new Error(`User "${username}" does not exist`)
  delete users[username]
  writeUsers(dataDir, users)
}

// ---- sessions -------------------------------------------------------------------
// A session is a signed, expiring cookie naming the user. It also carries a
// fingerprint of the password hash, so changing a password signs that user out
// everywhere, and a removed user's cookie stops working at once.

function sessionSecret(dataDir) {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET
  try {
    return fs.readFileSync(secretFile(dataDir), 'utf8')
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
  }
  fs.mkdirSync(authDir(dataDir), { recursive: true, mode: 0o700 })
  const secret = crypto.randomBytes(48).toString('hex')
  try {
    fs.writeFileSync(secretFile(dataDir), secret, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
    return secret
  } catch (err) {
    if (err.code === 'EEXIST') return fs.readFileSync(secretFile(dataDir), 'utf8')
    throw err
  }
}

const fingerprint = (hash) => crypto.createHash('sha256').update(hash).digest('hex').slice(0, 16)
const sign = (secret, body) => crypto.createHmac('sha256', secret).update(body).digest('base64url')

function issueToken(secret, username, hash) {
  const body = Buffer.from(JSON.stringify({ u: username, f: fingerprint(hash), exp: Date.now() + SESSION_MS })).toString('base64url')
  return `${body}.${sign(secret, body)}`
}

// Returns the username when the token is genuine, unexpired and still matches an account.
function readToken(secret, token, users) {
  const [body, signature, extra] = String(token ?? '').split('.')
  if (!body || !signature || extra !== undefined) return null
  const expected = Buffer.from(sign(secret, body))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null
  let claims
  try {
    claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (typeof claims?.u !== 'string' || !USERNAME_PATTERN.test(claims.u) || !(claims.exp > Date.now())) return null
  const account = Object.hasOwn(users, claims.u) ? users[claims.u] : null
  if (!account || claims.f !== fingerprint(account.hash)) return null
  return claims.u
}

function parseCookies(header = '') {
  const cookies = {}
  for (const part of header.split(';')) {
    const at = part.indexOf('=')
    if (at > 0) cookies[part.slice(0, at).trim()] = decodeURIComponent(part.slice(at + 1).trim())
  }
  return cookies
}

function cookieFor(req, value, maxAgeMs) {
  const attrs = [`${COOKIE}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${Math.floor(maxAgeMs / 1000)}`]
  if (req.secure || process.env.COOKIE_SECURE === 'true') attrs.push('Secure')
  return attrs.join('; ')
}

// The address used to throttle logins. Behind Cloudflare, CLIENT_IP_HEADER=CF-Connecting-IP
// names the header Cloudflare sets with the visitor's address; only use it when every request
// reaches the app through Cloudflare.
function clientAddress(req) {
  const header = process.env.CLIENT_IP_HEADER
  const value = header && req.headers[header.toLowerCase()]
  return typeof value === 'string' && value ? value.trim() : req.ip
}

// ---- throttling -----------------------------------------------------------------

function createThrottle() {
  const failures = new Map()
  const recent = (key) => {
    const now = Date.now()
    const list = (failures.get(key) ?? []).filter((t) => now - t < FAILURE_WINDOW_MS)
    if (list.length) failures.set(key, list)
    else failures.delete(key)
    return list
  }
  return {
    blocked: (...keys) => keys.some((key) => recent(key).length >= MAX_FAILURES),
    fail: (...keys) => keys.forEach((key) => failures.set(key, [...recent(key), Date.now()])),
    clear: (...keys) => keys.forEach((key) => failures.delete(key)),
  }
}

// ---- express wiring -------------------------------------------------------------

// Sets req.user and req.dataDir (that user's own folder) or answers 401.
export function createAuth(dataDir) {
  const secret = sessionSecret(dataDir)
  const throttle = createThrottle()

  const sessionUser = (req) => readToken(secret, parseCookies(req.headers.cookie)[COOKIE], readUsers(dataDir))

  function requireUser(req, res, next) {
    const username = sessionUser(req)
    if (!username) return res.status(401).json({ error: 'Please sign in' })
    req.user = username
    req.dataDir = userDataDir(dataDir, username)
    next()
  }

  const routes = Router()

  routes.get('/me', (req, res) => {
    const username = sessionUser(req)
    if (!username) return res.status(401).json({ error: 'Please sign in' })
    res.json({ username })
  })

  routes.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body ?? {}
      if (typeof username !== 'string' || typeof password !== 'string' || password.length > 1024) {
        return res.status(400).json({ error: 'Enter a username and password' })
      }
      const name = username.trim().toLowerCase()
      const ipKey = `ip:${clientAddress(req)}`
      const userKey = `user:${name}`
      if (throttle.blocked(ipKey, userKey)) {
        return res.status(429).json({ error: 'Too many failed attempts. Try again in a few minutes.' })
      }
      const users = readUsers(dataDir)
      const account = Object.hasOwn(users, name) ? users[name] : null
      const ok = await verifyPassword(password, account ? account.hash : DUMMY_HASH)
      if (!account || !ok) {
        throttle.fail(ipKey, userKey)
        return res.status(401).json({ error: 'Wrong username or password' })
      }
      throttle.clear(ipKey, userKey)
      res.setHeader('Set-Cookie', cookieFor(req, issueToken(secret, name, account.hash), SESSION_MS))
      res.json({ username: name })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  routes.post('/logout', (req, res) => {
    res.setHeader('Set-Cookie', cookieFor(req, '', 0))
    res.json({ success: true })
  })

  return { requireUser, routes }
}

// Refuses state-changing requests that a different site's page sent from a browser.
export function sameOriginOnly(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next()
  const origin = req.headers.origin
  if (origin) {
    let host
    try {
      host = new URL(origin).host
    } catch {
      host = null
    }
    if (host !== req.headers.host) return res.status(403).json({ error: 'Cross-site request refused' })
  }
  next()
}
