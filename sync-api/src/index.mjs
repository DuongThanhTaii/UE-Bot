import crypto from 'node:crypto'
import process from 'node:process'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import { Pool } from 'pg'
import 'dotenv/config'

const app = express()
app.use(express.json({ limit: '2mb' }))
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',').map((item) => item.trim()) ?? '*',
    credentials: false,
  })
)

const PORT = Number(process.env.PORT ?? 4010)
const DATABASE_URL = process.env.DATABASE_URL
const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? 'dev-secret-change-me'
const JWT_EXPIRES_IN = process.env.AUTH_JWT_EXPIRES_IN ?? '30d'
const PASSWORD_SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS ?? 12)
const OTP_EXPIRES_MINUTES = Number(process.env.OTP_EXPIRES_MINUTES ?? 10)
const GUEST_PROMPT_LIMIT = Number(process.env.GUEST_PROMPT_LIMIT ?? 3)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID ?? ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? ''
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URI ?? ''
const FRONTEND_OAUTH_REDIRECT =
  process.env.GOOGLE_OAUTH_FRONTEND_REDIRECT ?? 'http://localhost:3000/'
const MIGRATE_ONLY = process.argv.includes('--migrate-only')

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

const pool = new Pool({ connectionString: DATABASE_URL })

const otpTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: String(process.env.SMTP_SECURE ?? 'false') === 'true',
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
})

const guestSessions = new Map()
const googleStates = new Map()

const nowMs = () => Date.now()
const nowSeconds = () => Math.floor(Date.now() / 1000)

const sha256 = (value) =>
  crypto.createHash('sha256').update(String(value)).digest('hex')

const randomId = () => crypto.randomUUID()
const randomDigits = (length = 6) =>
  Array.from({ length }, () => Math.floor(Math.random() * 10)).join('')

const issueToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.display_name ?? null,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )

const authMiddleware = async (req, _res, next) => {
  try {
    const rawHeader = req.headers.authorization
    if (!rawHeader?.startsWith('Bearer ')) {
      req.authUser = null
      next()
      return
    }

    const token = rawHeader.slice('Bearer '.length).trim()
    const decoded = jwt.verify(token, JWT_SECRET)
    const userId = decoded?.sub
    if (!userId) {
      req.authUser = null
      next()
      return
    }

    const { rows } = await pool.query(
      `select id, email, display_name from users where id = $1 limit 1`,
      [userId]
    )

    req.authUser = rows[0] ?? null
    next()
  } catch {
    req.authUser = null
    next()
  }
}

const requireUser = (req, res, next) => {
  if (!req.authUser) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}

const requireGuestSession = (req, res, next) => {
  const id =
    req.headers['x-guest-session-id'] ??
    req.body?.guestSessionId ??
    req.query?.guestSessionId

  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'guestSessionId is required' })
    return
  }

  const session = guestSessions.get(id)
  if (!session) {
    res.status(404).json({ error: 'Guest session not found' })
    return
  }

  req.guestSessionId = id
  req.guestSession = session
  next()
}

const sanitizeThread = (thread) => ({
  ...thread,
  metadata: thread?.metadata ?? {},
  assistants: Array.isArray(thread?.assistants) ? thread.assistants : [],
  object: thread?.object ?? 'thread',
})

const sanitizeMessage = (message, threadId) => ({
  ...message,
  thread_id: threadId,
  object: message?.object ?? 'thread.message',
  attachments: message?.attachments ?? null,
  metadata: message?.metadata ?? {},
  type: message?.type ?? 'text',
})

const getGuestStore = (guestSessionId) => {
  const session = guestSessions.get(guestSessionId)
  if (!session) return null
  return session
}

const getGuestSessionIdFromRequest = (req) =>
  String(
    req.body?.guestSessionId ?? req.query?.guestSessionId ?? req.headers['x-guest-session-id'] ?? ''
  ).trim()

const consumeGuestPromptForRequest = (req, res) => {
  if (req.authUser) {
    return { allowed: true, requiresLogin: false, remainingPrompts: null }
  }

  const guestSessionId = getGuestSessionIdFromRequest(req)
  const guest = getGuestStore(guestSessionId)
  if (!guest) {
    res.status(404).json({ error: 'Guest session not found' })
    return null
  }

  if (guest.promptCount >= GUEST_PROMPT_LIMIT) {
    res.status(403).json({
      allowed: false,
      requiresLogin: true,
      remainingPrompts: 0,
      promptLimit: GUEST_PROMPT_LIMIT,
      promptCount: guest.promptCount,
    })
    return null
  }

  guest.promptCount += 1
  guest.expiresAt = nowMs() + 1000 * 60 * 60 * 24

  return {
    allowed: true,
    requiresLogin: false,
    remainingPrompts: Math.max(GUEST_PROMPT_LIMIT - guest.promptCount, 0),
    promptLimit: GUEST_PROMPT_LIMIT,
    promptCount: guest.promptCount,
  }
}

const upsertUserByEmail = async ({ email, displayName, googleSub }) => {
  const normalizedEmail = String(email).trim().toLowerCase()
  const { rows } = await pool.query(
    `
    insert into users (email, display_name, google_sub)
    values ($1, $2, $3)
    on conflict (email) do update
      set display_name = coalesce(excluded.display_name, users.display_name),
          google_sub = coalesce(excluded.google_sub, users.google_sub)
    returning id, email, display_name
    `,
    [normalizedEmail, displayName ?? null, googleSub ?? null]
  )
  return rows[0]
}

const mergeGuestToUser = async (guestSessionId, userId) => {
  const session = guestSessions.get(guestSessionId)
  if (!session) return

  const threads = Object.values(session.threads)
  for (const thread of threads) {
    await pool.query(
      `
      insert into threads (id, user_id, object, title, assistants, created, updated, metadata)
      values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb)
      on conflict (id) do update
      set user_id = excluded.user_id,
          object = excluded.object,
          title = excluded.title,
          assistants = excluded.assistants,
          created = excluded.created,
          updated = excluded.updated,
          metadata = excluded.metadata
      `,
      [
        thread.id,
        userId,
        thread.object ?? 'thread',
        thread.title ?? 'New chat',
        JSON.stringify(thread.assistants ?? []),
        Number(thread.created ?? nowSeconds()),
        Number(thread.updated ?? nowSeconds()),
        JSON.stringify(thread.metadata ?? {}),
      ]
    )
  }

  for (const message of session.messages) {
    await pool.query(
      `
      insert into messages (
        id, thread_id, user_id, assistant_id, attachments, role,
        content, status, created_at, completed_at, metadata,
        type, error_code, tool_call_id, object
      )
      values (
        $1,$2,$3,$4,$5::jsonb,$6,
        $7::jsonb,$8,$9,$10,$11::jsonb,
        $12,$13,$14,$15
      )
      on conflict (id) do update
      set thread_id = excluded.thread_id,
          user_id = excluded.user_id,
          assistant_id = excluded.assistant_id,
          attachments = excluded.attachments,
          role = excluded.role,
          content = excluded.content,
          status = excluded.status,
          created_at = excluded.created_at,
          completed_at = excluded.completed_at,
          metadata = excluded.metadata,
          type = excluded.type,
          error_code = excluded.error_code,
          tool_call_id = excluded.tool_call_id,
          object = excluded.object
      `,
      [
        message.id,
        message.thread_id,
        userId,
        message.assistant_id ?? null,
        JSON.stringify(message.attachments ?? null),
        message.role,
        JSON.stringify(message.content ?? []),
        message.status ?? 'ready',
        Number(message.created_at ?? nowMs()),
        Number(message.completed_at ?? nowMs()),
        JSON.stringify(message.metadata ?? {}),
        message.type ?? 'text',
        message.error_code ?? null,
        message.tool_call_id ?? null,
        message.object ?? 'thread.message',
      ]
    )
  }

  guestSessions.delete(guestSessionId)
}

const cleanExpiredStates = () => {
  const now = nowMs()

  for (const [id, state] of googleStates.entries()) {
    if (state.expiresAt < now) googleStates.delete(id)
  }

  for (const [id, session] of guestSessions.entries()) {
    if (session.expiresAt < now) guestSessions.delete(id)
  }
}

const cleanupInterval = setInterval(cleanExpiredStates, 60_000)
if (MIGRATE_ONLY) {
  cleanupInterval.unref()
}

app.use(authMiddleware)

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'sync-api' })
})

app.post('/auth/guest/session', (_req, res) => {
  const id = randomId()
  guestSessions.set(id, {
    promptCount: 0,
    createdAt: nowMs(),
    expiresAt: nowMs() + 1000 * 60 * 60 * 24,
    threads: {},
    messages: [],
  })

  res.json({
    guestSessionId: id,
    promptLimit: GUEST_PROMPT_LIMIT,
    promptCount: 0,
    remainingPrompts: GUEST_PROMPT_LIMIT,
  })
})

app.get('/auth/me', requireUser, (req, res) => {
  res.json({
    user: {
      id: req.authUser.id,
      email: req.authUser.email,
      name: req.authUser.display_name,
    },
  })
})

app.post('/auth/otp/request', async (req, res) => {
  try {
    const email = String(req.body?.email ?? '')
      .trim()
      .toLowerCase()

    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'A valid email is required' })
      return
    }

    const otp = randomDigits(6)
    const hash = sha256(`${otp}:${JWT_SECRET}`)
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60_000)

    await pool.query(
      `
      insert into otp_codes (email, code_hash, expires_at, attempts)
      values ($1,$2,$3,0)
      on conflict (email) do update
      set code_hash = excluded.code_hash,
          expires_at = excluded.expires_at,
          attempts = 0,
          created_at = now()
      `,
      [email, hash, expiresAt]
    )

    await otpTransport.sendMail({
      from: process.env.OTP_FROM_EMAIL ?? process.env.SMTP_USER,
      to: email,
      subject: 'Your UE Bot verification code',
      text: `Your OTP is ${otp}. It expires in ${OTP_EXPIRES_MINUTES} minutes.`,
    })

    res.json({ ok: true, otpExpiresInMinutes: OTP_EXPIRES_MINUTES })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to request OTP',
    })
  }
})

app.post('/auth/otp/verify', async (req, res) => {
  try {
    const email = String(req.body?.email ?? '')
      .trim()
      .toLowerCase()
    const otp = String(req.body?.otp ?? '').trim()
    const guestSessionId = String(req.body?.guestSessionId ?? '').trim()

    if (!email || !otp) {
      res.status(400).json({ error: 'email and otp are required' })
      return
    }

    const { rows } = await pool.query(
      `select email, code_hash, expires_at, attempts from otp_codes where email = $1 limit 1`,
      [email]
    )

    if (!rows.length) {
      res.status(400).json({ error: 'OTP not found or expired' })
      return
    }

    const row = rows[0]
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await pool.query(`delete from otp_codes where email = $1`, [email])
      res.status(400).json({ error: 'OTP has expired' })
      return
    }

    const currentAttempts = Number(row.attempts ?? 0)
    if (currentAttempts >= 5) {
      res.status(429).json({ error: 'Too many attempts. Request a new OTP.' })
      return
    }

    const expectedHash = row.code_hash
    const incomingHash = sha256(`${otp}:${JWT_SECRET}`)

    if (incomingHash !== expectedHash) {
      await pool.query(`update otp_codes set attempts = attempts + 1 where email = $1`, [email])
      res.status(400).json({ error: 'Invalid OTP' })
      return
    }

    await pool.query(`delete from otp_codes where email = $1`, [email])

    const user = await upsertUserByEmail({
      email,
      displayName: email.split('@')[0],
      googleSub: null,
    })

    if (guestSessionId) {
      await mergeGuestToUser(guestSessionId, user.id)
    }

    const token = issueToken(user)
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.display_name },
    })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to verify OTP',
    })
  }
})

app.post('/auth/password/set', requireUser, async (req, res) => {
  try {
    const password = String(req.body?.password ?? '')

    if (!password) {
      res.status(400).json({ error: 'password is required' })
      return
    }

    if (password.length < 8 || password.length > 72) {
      res.status(400).json({ error: 'password length must be between 8 and 72 characters' })
      return
    }

    const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS)

    const { rows } = await pool.query(
      `
      update users
      set password_hash = $2
      where id = $1
      returning id, email, display_name
      `,
      [req.authUser.id, passwordHash]
    )

    if (!rows.length) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    res.json({
      ok: true,
      user: {
        id: rows[0].id,
        email: rows[0].email,
        name: rows[0].display_name,
      },
    })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to set password',
    })
  }
})

app.post('/auth/password/login', async (req, res) => {
  try {
    const email = String(req.body?.email ?? '')
      .trim()
      .toLowerCase()
    const password = String(req.body?.password ?? '')
    const guestSessionId = String(req.body?.guestSessionId ?? '').trim()

    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' })
      return
    }

    const { rows } = await pool.query(
      `
      select id, email, display_name, password_hash
      from users
      where email = $1
      limit 1
      `,
      [email]
    )

    if (!rows.length || !rows[0].password_hash) {
      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    const user = rows[0]
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    if (guestSessionId) {
      await mergeGuestToUser(guestSessionId, user.id)
    }

    const token = issueToken(user)
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.display_name,
      },
    })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to login with password',
    })
  }
})

app.get('/auth/google/start', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    res.status(400).json({
      error:
        'Google OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI.',
    })
    return
  }

  const state = randomId()
  const guestSessionId = String(req.query?.guestSessionId ?? '')
  const frontendRedirect = String(req.query?.redirect ?? FRONTEND_OAUTH_REDIRECT)

  googleStates.set(state, {
    guestSessionId: guestSessionId || null,
    frontendRedirect,
    expiresAt: nowMs() + 10 * 60_000,
  })

  const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  oauthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
  oauthUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI)
  oauthUrl.searchParams.set('response_type', 'code')
  oauthUrl.searchParams.set('scope', 'openid email profile')
  oauthUrl.searchParams.set('state', state)
  oauthUrl.searchParams.set('access_type', 'offline')
  oauthUrl.searchParams.set('prompt', 'consent')

  res.redirect(oauthUrl.toString())
})

app.get('/auth/google/callback', async (req, res) => {
  const code = String(req.query?.code ?? '')
  const state = String(req.query?.state ?? '')

  if (!code || !state) {
    res.status(400).send('Missing code/state')
    return
  }

  const stateData = googleStates.get(state)
  googleStates.delete(state)

  if (!stateData || stateData.expiresAt < nowMs()) {
    res.status(400).send('Google OAuth state is invalid or expired')
    return
  }

  try {
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResp.ok) {
      const body = await tokenResp.text()
      throw new Error(`Google token exchange failed: ${body}`)
    }

    const tokenData = await tokenResp.json()
    const idToken = tokenData.id_token
    if (!idToken) {
      throw new Error('Missing id_token from Google')
    }

    const verifyResp = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    )

    if (!verifyResp.ok) {
      const body = await verifyResp.text()
      throw new Error(`Google token verification failed: ${body}`)
    }

    const googleUser = await verifyResp.json()

    if (googleUser.aud !== GOOGLE_CLIENT_ID) {
      throw new Error('Google token audience mismatch')
    }

    const user = await upsertUserByEmail({
      email: googleUser.email,
      displayName: googleUser.name,
      googleSub: googleUser.sub,
    })

    if (stateData.guestSessionId) {
      await mergeGuestToUser(stateData.guestSessionId, user.id)
    }

    const token = issueToken(user)
    const redirectUrl = new URL(stateData.frontendRedirect)
    redirectUrl.searchParams.set('authToken', token)
    res.redirect(redirectUrl.toString())
  } catch (error) {
    const redirectUrl = new URL(stateData.frontendRedirect)
    redirectUrl.searchParams.set(
      'authError',
      error instanceof Error ? error.message : 'Google OAuth failed'
    )
    res.redirect(redirectUrl.toString())
  }
})

app.post('/usage/consume', async (req, res) => {
  if (req.authUser) {
    res.json({ allowed: true, requiresLogin: false, remainingPrompts: null })
    return
  }

  const guestSessionId = getGuestSessionIdFromRequest(req)
  const guest = guestSessions.get(guestSessionId)
  if (!guest) {
    res.status(404).json({ error: 'Guest session not found' })
    return
  }

  const remainingPrompts = Math.max(GUEST_PROMPT_LIMIT - guest.promptCount, 0)

  if (remainingPrompts <= 0) {
    res.json({
      allowed: false,
      requiresLogin: true,
      remainingPrompts: 0,
      promptLimit: GUEST_PROMPT_LIMIT,
      promptCount: guest.promptCount,
    })
    return
  }

  res.json({
    allowed: true,
    requiresLogin: false,
    remainingPrompts,
    promptLimit: GUEST_PROMPT_LIMIT,
    promptCount: guest.promptCount,
  })
})

app.get('/usage/status', (req, res) => {
  if (req.authUser) {
    res.json({ allowed: true, remainingPrompts: null, requiresLogin: false })
    return
  }

  const guestSessionId = String(req.query?.guestSessionId ?? '').trim()
  const guest = guestSessions.get(guestSessionId)
  if (!guest) {
    res.status(404).json({ error: 'Guest session not found' })
    return
  }

  const remaining = Math.max(GUEST_PROMPT_LIMIT - guest.promptCount, 0)
  res.json({
    allowed: remaining > 0,
    requiresLogin: remaining <= 0,
    remainingPrompts: remaining,
    promptLimit: GUEST_PROMPT_LIMIT,
    promptCount: guest.promptCount,
  })
})

app.get('/threads', async (req, res) => {
  try {
    if (req.authUser) {
      const { rows } = await pool.query(
        `
        select id, object, title, assistants, created, updated, metadata
        from threads
        where user_id = $1
        order by updated desc
        `,
        [req.authUser.id]
      )
      res.json(
        rows.map((row) => ({
          id: row.id,
          object: row.object,
          title: row.title,
          assistants: row.assistants ?? [],
          created: Number(row.created ?? nowSeconds()),
          updated: Number(row.updated ?? nowSeconds()),
          metadata: row.metadata ?? {},
        }))
      )
      return
    }

    const guestSessionId = String(req.query?.guestSessionId ?? '').trim()
    const guest = getGuestStore(guestSessionId)
    if (!guest) {
      res.status(401).json({ error: 'Authentication or guestSessionId is required' })
      return
    }

    res.json(
      Object.values(guest.threads).sort(
        (a, b) => Number(b.updated ?? 0) - Number(a.updated ?? 0)
      )
    )
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to list threads' })
  }
})

app.post('/threads', async (req, res) => {
  try {
    const thread = sanitizeThread(req.body?.thread ?? req.body)

    if (!thread?.id) {
      res.status(400).json({ error: 'thread.id is required' })
      return
    }

    if (req.authUser) {
      await pool.query(
        `
        insert into threads (id, user_id, object, title, assistants, created, updated, metadata)
        values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb)
        on conflict (id) do update
          set user_id = excluded.user_id,
              object = excluded.object,
              title = excluded.title,
              assistants = excluded.assistants,
              created = excluded.created,
              updated = excluded.updated,
              metadata = excluded.metadata
        `,
        [
          thread.id,
          req.authUser.id,
          thread.object,
          thread.title,
          JSON.stringify(thread.assistants ?? []),
          Number(thread.created ?? nowSeconds()),
          Number(thread.updated ?? nowSeconds()),
          JSON.stringify(thread.metadata ?? {}),
        ]
      )

      res.json(thread)
      return
    }

    const guestSessionId = String(req.body?.guestSessionId ?? '').trim()
    const guest = getGuestStore(guestSessionId)
    if (!guest) {
      res.status(401).json({ error: 'Authentication or guestSessionId is required' })
      return
    }

    guest.threads[thread.id] = thread
    guest.expiresAt = nowMs() + 1000 * 60 * 60 * 24
    res.json(thread)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create thread' })
  }
})

app.patch('/threads/:threadId', async (req, res) => {
  try {
    const threadId = req.params.threadId
    const patch = req.body?.thread ?? req.body

    if (req.authUser) {
      const { rows } = await pool.query(
        `select id, object, title, assistants, created, updated, metadata from threads where id = $1 and user_id = $2`,
        [threadId, req.authUser.id]
      )

      if (!rows.length) {
        res.status(404).json({ error: 'Thread not found' })
        return
      }

      const existing = rows[0]
      const next = sanitizeThread({
        ...existing,
        ...patch,
        id: threadId,
        updated: nowSeconds(),
      })

      await pool.query(
        `
        update threads
        set object = $3,
            title = $4,
            assistants = $5::jsonb,
            created = $6,
            updated = $7,
            metadata = $8::jsonb
        where id = $1 and user_id = $2
        `,
        [
          threadId,
          req.authUser.id,
          next.object,
          next.title,
          JSON.stringify(next.assistants ?? []),
          Number(next.created ?? nowSeconds()),
          Number(next.updated ?? nowSeconds()),
          JSON.stringify(next.metadata ?? {}),
        ]
      )

      res.json(next)
      return
    }

    const guestSessionId = String(req.body?.guestSessionId ?? '').trim()
    const guest = getGuestStore(guestSessionId)
    if (!guest) {
      res.status(401).json({ error: 'Authentication or guestSessionId is required' })
      return
    }

    const existing = guest.threads[threadId]
    if (!existing) {
      res.status(404).json({ error: 'Thread not found' })
      return
    }

    const next = sanitizeThread({ ...existing, ...patch, id: threadId })
    guest.threads[threadId] = next
    guest.expiresAt = nowMs() + 1000 * 60 * 60 * 24
    res.json(next)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update thread' })
  }
})

app.delete('/threads/:threadId', async (req, res) => {
  try {
    const threadId = req.params.threadId

    if (req.authUser) {
      await pool.query(`delete from messages where thread_id = $1 and user_id = $2`, [threadId, req.authUser.id])
      await pool.query(`delete from threads where id = $1 and user_id = $2`, [threadId, req.authUser.id])
      res.json({ ok: true })
      return
    }

    const guestSessionId = String(req.query?.guestSessionId ?? req.body?.guestSessionId ?? '').trim()
    const guest = getGuestStore(guestSessionId)
    if (!guest) {
      res.status(401).json({ error: 'Authentication or guestSessionId is required' })
      return
    }

    delete guest.threads[threadId]
    guest.messages = guest.messages.filter((m) => m.thread_id !== threadId)
    guest.expiresAt = nowMs() + 1000 * 60 * 60 * 24

    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete thread' })
  }
})

app.get('/threads/:threadId/messages', async (req, res) => {
  try {
    const threadId = req.params.threadId

    if (req.authUser) {
      const { rows } = await pool.query(
        `
        select id, object, thread_id, assistant_id, attachments, role, content,
               status, created_at, completed_at, metadata, type, error_code, tool_call_id
        from messages
        where user_id = $1 and thread_id = $2
        order by created_at asc
        `,
        [req.authUser.id, threadId]
      )
      res.json(rows)
      return
    }

    const guestSessionId = String(req.query?.guestSessionId ?? '').trim()
    const guest = getGuestStore(guestSessionId)
    if (!guest) {
      res.status(401).json({ error: 'Authentication or guestSessionId is required' })
      return
    }

    res.json(
      guest.messages
        .filter((msg) => msg.thread_id === threadId)
        .sort((a, b) => Number(a.created_at ?? 0) - Number(b.created_at ?? 0))
    )
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to list messages' })
  }
})

app.post('/threads/:threadId/messages', async (req, res) => {
  try {
    const threadId = req.params.threadId
    const message = sanitizeMessage(req.body?.message ?? req.body, threadId)

    if (!message?.id) {
      res.status(400).json({ error: 'message.id is required' })
      return
    }

    const isGuestPrompt = !req.authUser && message.role === 'user'
    let guestUsage = null
    if (isGuestPrompt) {
      guestUsage = consumeGuestPromptForRequest(req, res)
      if (!guestUsage) return
    }

    if (req.authUser) {
      await pool.query(
        `
        insert into messages (
          id, thread_id, user_id, assistant_id, attachments, role,
          content, status, created_at, completed_at, metadata,
          type, error_code, tool_call_id, object
        ) values (
          $1,$2,$3,$4,$5::jsonb,$6,
          $7::jsonb,$8,$9,$10,$11::jsonb,
          $12,$13,$14,$15
        )
        on conflict (id) do update
        set thread_id = excluded.thread_id,
            user_id = excluded.user_id,
            assistant_id = excluded.assistant_id,
            attachments = excluded.attachments,
            role = excluded.role,
            content = excluded.content,
            status = excluded.status,
            created_at = excluded.created_at,
            completed_at = excluded.completed_at,
            metadata = excluded.metadata,
            type = excluded.type,
            error_code = excluded.error_code,
            tool_call_id = excluded.tool_call_id,
            object = excluded.object
        `,
        [
          message.id,
          threadId,
          req.authUser.id,
          message.assistant_id ?? null,
          JSON.stringify(message.attachments ?? null),
          message.role,
          JSON.stringify(message.content ?? []),
          message.status ?? 'ready',
          Number(message.created_at ?? nowMs()),
          Number(message.completed_at ?? nowMs()),
          JSON.stringify(message.metadata ?? {}),
          message.type ?? 'text',
          message.error_code ?? null,
          message.tool_call_id ?? null,
          message.object ?? 'thread.message',
        ]
      )

      res.json(message)
      return
    }

    const guestSessionId = String(req.body?.guestSessionId ?? '').trim()
    const guest = getGuestStore(guestSessionId)
    if (!guest) {
      res.status(401).json({ error: 'Authentication or guestSessionId is required' })
      return
    }

    guest.messages = guest.messages.filter((m) => m.id !== message.id)
    guest.messages.push(message)
    guest.expiresAt = nowMs() + 1000 * 60 * 60 * 24

    res.json({ ...message, usage: guestUsage })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create message' })
  }
})

app.patch('/threads/:threadId/messages/:messageId', async (req, res) => {
  try {
    const threadId = req.params.threadId
    const messageId = req.params.messageId

    if (req.authUser) {
      const { rows } = await pool.query(
        `
        select id, object, thread_id, assistant_id, attachments, role, content,
               status, created_at, completed_at, metadata, type, error_code, tool_call_id
        from messages
        where id = $1 and thread_id = $2 and user_id = $3
        limit 1
        `,
        [messageId, threadId, req.authUser.id]
      )

      if (!rows.length) {
        res.status(404).json({ error: 'Message not found' })
        return
      }

      const next = sanitizeMessage(
        {
          ...rows[0],
          ...(req.body?.message ?? req.body),
          id: messageId,
        },
        threadId
      )

      await pool.query(
        `
        update messages
        set assistant_id = $4,
            attachments = $5::jsonb,
            role = $6,
            content = $7::jsonb,
            status = $8,
            created_at = $9,
            completed_at = $10,
            metadata = $11::jsonb,
            type = $12,
            error_code = $13,
            tool_call_id = $14,
            object = $15
        where id = $1 and thread_id = $2 and user_id = $3
        `,
        [
          messageId,
          threadId,
          req.authUser.id,
          next.assistant_id ?? null,
          JSON.stringify(next.attachments ?? null),
          next.role,
          JSON.stringify(next.content ?? []),
          next.status ?? 'ready',
          Number(next.created_at ?? nowMs()),
          Number(next.completed_at ?? nowMs()),
          JSON.stringify(next.metadata ?? {}),
          next.type ?? 'text',
          next.error_code ?? null,
          next.tool_call_id ?? null,
          next.object ?? 'thread.message',
        ]
      )

      res.json(next)
      return
    }

    const guestSessionId = String(req.body?.guestSessionId ?? '').trim()
    const guest = getGuestStore(guestSessionId)
    if (!guest) {
      res.status(401).json({ error: 'Authentication or guestSessionId is required' })
      return
    }

    const idx = guest.messages.findIndex((m) => m.id === messageId && m.thread_id === threadId)
    if (idx < 0) {
      res.status(404).json({ error: 'Message not found' })
      return
    }

    const next = sanitizeMessage(
      {
        ...guest.messages[idx],
        ...(req.body?.message ?? req.body),
        id: messageId,
      },
      threadId
    )
    guest.messages[idx] = next
    guest.expiresAt = nowMs() + 1000 * 60 * 60 * 24

    res.json(next)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update message' })
  }
})

app.delete('/threads/:threadId/messages/:messageId', async (req, res) => {
  try {
    const threadId = req.params.threadId
    const messageId = req.params.messageId

    if (req.authUser) {
      await pool.query(
        `delete from messages where id = $1 and thread_id = $2 and user_id = $3`,
        [messageId, threadId, req.authUser.id]
      )
      res.json({ ok: true })
      return
    }

    const guestSessionId = String(req.query?.guestSessionId ?? req.body?.guestSessionId ?? '').trim()
    const guest = getGuestStore(guestSessionId)
    if (!guest) {
      res.status(401).json({ error: 'Authentication or guestSessionId is required' })
      return
    }

    guest.messages = guest.messages.filter((m) => !(m.id === messageId && m.thread_id === threadId))
    guest.expiresAt = nowMs() + 1000 * 60 * 60 * 24

    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete message' })
  }
})

const runMigrations = async () => {
  await pool.query(`create extension if not exists pgcrypto`)

  await pool.query(`
    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      email text unique not null,
      display_name text,
      password_hash text,
      google_sub text unique,
      created_at timestamptz not null default now()
    )
  `)

  await pool.query(`alter table users add column if not exists password_hash text`)

  await pool.query(`
    create table if not exists otp_codes (
      email text primary key,
      code_hash text not null,
      expires_at timestamptz not null,
      attempts integer not null default 0,
      created_at timestamptz not null default now()
    )
  `)

  await pool.query(`
    create table if not exists threads (
      id text primary key,
      user_id uuid not null references users(id) on delete cascade,
      object text not null default 'thread',
      title text not null default 'New chat',
      assistants jsonb not null default '[]'::jsonb,
      created bigint not null,
      updated bigint not null,
      metadata jsonb not null default '{}'::jsonb
    )
  `)

  await pool.query(`
    create index if not exists idx_threads_user_updated
      on threads(user_id, updated desc)
  `)

  await pool.query(`
    create table if not exists messages (
      id text primary key,
      thread_id text not null references threads(id) on delete cascade,
      user_id uuid not null references users(id) on delete cascade,
      assistant_id text,
      attachments jsonb,
      role text not null,
      content jsonb not null default '[]'::jsonb,
      status text not null default 'ready',
      created_at bigint not null,
      completed_at bigint not null,
      metadata jsonb not null default '{}'::jsonb,
      type text,
      error_code text,
      tool_call_id text,
      object text not null default 'thread.message'
    )
  `)

  await pool.query(`
    create index if not exists idx_messages_user_thread_created
      on messages(user_id, thread_id, created_at asc)
  `)
}

const start = async () => {
  await runMigrations()

  if (MIGRATE_ONLY) {
    console.log('[sync-api] migrations completed')
    await pool.end()
    return
  }

  app.listen(PORT, () => {
    console.log(`[sync-api] listening on http://127.0.0.1:${PORT}`)
  })
}

start().catch((error) => {
  console.error('[sync-api] failed to start:', error)
  process.exit(1)
})
