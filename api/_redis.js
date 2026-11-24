// Shared helpers for the API functions. Files starting with "_" are not routes on Vercel.
import { timingSafeEqual } from 'node:crypto'

// Vercel's Upstash Redis integration sets one of these pairs automatically.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

export const redisReady = Boolean(URL_ && TOKEN)

// Runs one Redis command through Upstash's REST API, e.g. redis('HGET', 'bookings', id).
export async function redis(...command) {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.result
}

export function isAdmin(req) {
  const password = process.env.ADMIN_PASSWORD || ''
  const given = String(req.headers['x-admin-key'] || '')
  if (!password || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(password)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function readBody(req) {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  return req.body || {}
}
