#!/usr/bin/env node
/**
 * DB connection diagnostic
 * Run from apps/api:  node scripts/test-db.mjs
 * It reads .env itself so no --env-file flag needed.
 */
import { readFileSync } from 'fs'
import { createConnection } from 'net'

// ── Read .env manually ────────────────────────────────────────────────────────
function loadEnv(path) {
  try {
    const lines = readFileSync(path, 'utf8').split('\n')
    for (const raw of lines) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq === -1) continue
      const key = line.slice(0, eq).trim()
      let val = line.slice(eq + 1).trim()
      // strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      process.env[key] = val
    }
    console.log('Loaded .env')
  } catch {
    console.log('No .env file found, using existing env vars')
  }
}

loadEnv('.env')

const rawUrl = process.env.DATABASE_URL
if (!rawUrl) { console.error('DATABASE_URL not set'); process.exit(1) }

// ── Parse and display (mask password) ─────────────────────────────────────────
let host, port, user, pass, db
try {
  const u = new URL(rawUrl)
  host = u.hostname
  port = parseInt(u.port || '5432')
  user = decodeURIComponent(u.username)
  pass = decodeURIComponent(u.password)
  db   = u.pathname.replace(/^\//, '')
  console.log('\n=== Parsed connection ===')
  console.log('Host:', host)
  console.log('Port:', port)
  console.log('User:', user)
  console.log('Pass:', pass ? pass.slice(0, 3) + '***' + pass.slice(-2) : '(empty!)')
  console.log('DB  :', db)
  console.log('Params:', u.search || '(none)')
} catch (e) {
  console.error('Cannot parse DATABASE_URL:', e.message)
  console.error('Raw value:', rawUrl)
  process.exit(1)
}

// ── TCP reachability test ──────────────────────────────────────────────────────
console.log(`\nTesting TCP to ${host}:${port}...`)
await new Promise((resolve) => {
  const sock = createConnection({ host, port, timeout: 8000 }, () => {
    console.log('TCP OK — host is reachable')
    sock.destroy()
    resolve()
  })
  sock.on('timeout', () => { console.error('TCP TIMEOUT — host unreachable (firewall/VPN)'); sock.destroy(); process.exit(1) })
  sock.on('error', (e) => { console.error('TCP ERROR:', e.message); process.exit(1) })
})

// ── Prisma quick query ─────────────────────────────────────────────────────────
console.log('\nTesting Prisma connection...')
try {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient({ datasourceUrl: rawUrl })
  const result = await prisma.$queryRaw`SELECT current_user`
  console.log('Prisma SUCCESS! Connected as:', result[0].current_user)
  await prisma.$disconnect()
} catch (e) {
  console.error('Prisma FAILED:', e.message)
  process.exit(1)
}
