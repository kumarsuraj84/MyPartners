#!/usr/bin/env node
/**
 * DB connection diagnostic — run with:
 *   node --env-file=.env scripts/test-db.js
 */
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const url = process.env.DATABASE_URL
if (!url) { console.error('DATABASE_URL not set'); process.exit(1) }

// Parse the URL to show what we're actually connecting to
try {
  const u = new URL(url)
  console.log('=== Connection details ===')
  console.log('Host    :', u.hostname)
  console.log('Port    :', u.port)
  console.log('User    :', u.username)
  console.log('Pass    :', u.password ? u.password.slice(0, 3) + '***' : '(empty)')
  console.log('DB      :', u.pathname)
  console.log('Params  :', u.search || '(none)')
  console.log('')
} catch (e) {
  console.error('Could not parse DATABASE_URL:', e.message)
  process.exit(1)
}

// Try raw pg connection
let pg
try { pg = require('pg') } catch { console.error('pg not installed — run: npm install pg'); process.exit(1) }

const { Client } = pg
const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 })

console.log('Connecting...')
client.connect()
  .then(() => client.query('SELECT current_user, version()'))
  .then(res => {
    console.log('SUCCESS! Connected as:', res.rows[0].current_user)
    console.log('PG version:', res.rows[0].version.split(' ').slice(0,2).join(' '))
    return client.end()
  })
  .catch(err => {
    console.error('FAILED:', err.message)
    if (err.code) console.error('Code:', err.code)
    process.exit(1)
  })
