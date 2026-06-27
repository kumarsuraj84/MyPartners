#!/usr/bin/env node
/**
 * Startup wrapper — reads .env manually (handles quoted values),
 * then imports the compiled API.
 * Usage: node scripts/start.mjs
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

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
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  } catch { /* no .env is fine */ }
}

loadEnv(resolve(__dir, '../.env'))

await import(resolve(__dir, '../dist/index.js'))
