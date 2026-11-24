// Bookings API.
//   POST   /api/bookings          public: save a new booking request
//   GET    /api/bookings          admin: list all bookings
//   PATCH  /api/bookings?id=...   admin: change status or notes
//   DELETE /api/bookings?id=...   admin: delete a booking
import { randomUUID } from 'node:crypto'
import { redis, redisReady, isAdmin, readBody } from './_redis.js'
import { notifyAdmins } from './_push.js'

const KEY = 'bookings'
const STATUSES = ['new', 'confirmed', 'completed', 'cancelled']
const VEHICLE_STATUSES = ['waiting', 'out', 'returned', 'unwashed']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const clean = (value, max) => String(value ?? '').trim().slice(0, max)

export default async function handler(req, res) {
  if (!redisReady) {
    return res.status(500).json({ ok: false, error: 'Database not connected. Add Upstash Redis in Vercel > Storage.' })
  }

  try {
    if (req.method === 'POST') return await create(req, res)

    if (!isAdmin(req)) return res.status(401).json({ ok: false, error: 'Wrong password.' })

    if (req.method === 'GET') {
      const flat = (await redis('HGETALL', KEY)) || []
      const bookings = []
      for (let i = 1; i < flat.length; i += 2) {
        try {
          bookings.push(JSON.parse(flat[i]))
        } catch {
          /* skip a damaged entry */
        }
      }
      bookings.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
      return res.status(200).json({ ok: true, bookings })
    }

    const id = clean(req.query.id, 64)
    if (!id) return res.status(400).json({ ok: false, error: 'Missing booking id.' })
    const existing = await redis('HGET', KEY, id)
    if (!existing) return res.status(404).json({ ok: false, error: 'Booking not found.' })

    if (req.method === 'PATCH') {
      const body = readBody(req)
      const booking = JSON.parse(existing)
      if (body.status !== undefined) {
        if (!STATUSES.includes(body.status)) return res.status(400).json({ ok: false, error: 'Unknown status.' })
        booking.status = body.status
      }
      if (body.notes !== undefined) booking.notes = clean(body.notes, 2000)
      if (body.vehicle !== undefined) booking.vehicle = clean(body.vehicle, 40)
      if (body.vehicleStatus !== undefined) {
        if (!VEHICLE_STATUSES.includes(body.vehicleStatus)) return res.status(400).json({ ok: false, error: 'Unknown vehicle status.' })
        booking.vehicleStatus = body.vehicleStatus
      }
      booking.updatedAt = new Date().toISOString()
      await redis('HSET', KEY, id, JSON.stringify(booking))
      return res.status(200).json({ ok: true, booking })
    }

    if (req.method === 'DELETE') {
      await redis('HDEL', KEY, id)
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE')
    return res.status(405).json({ ok: false, error: 'Method not allowed.' })
  } catch (err) {
    console.error('Bookings API error', err)
    return res.status(500).json({ ok: false, error: 'Server error. Please try again.' })
  }
}

async function create(req, res) {
  const body = readBody(req)

  // Bots fill the hidden field; pretend it worked and store nothing.
  if (body.botcheck) return res.status(200).json({ ok: true })

  // At most 10 requests per 10 minutes from one address.
  const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim()
  const rateKey = `rate:${ip}`
  const count = await redis('INCR', rateKey)
  if (count === 1) await redis('EXPIRE', rateKey, 600)
  if (count > 10) return res.status(429).json({ ok: false, error: 'Too many requests. Please try again later.' })

  const booking = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'new',
    name: clean(body.name, 80),
    city: clean(body.city, 60),
    contact: clean(body.contact, 20),
    passengers: Math.max(1, Math.min(30, parseInt(body.passengers, 10) || 1)),
    purposes: Array.isArray(body.purposes) ? body.purposes.map((p) => clean(p, 40)).slice(0, 10) : [],
    details: clean(body.details, 1000),
    start: clean(body.startISO, 10),
    end: clean(body.endISO, 10),
    notes: '',
    distanceKm: Number.isFinite(Number(body.distanceKm)) ? Math.max(0, Math.min(2000, Math.round(Number(body.distanceKm)))) : null,
    driveHours: Number.isFinite(Number(body.driveHours)) ? Math.max(0, Math.min(48, Number(body.driveHours))) : null,
  }

  const digits = booking.contact.replace(/\D/g, '')
  if (
    booking.name.length < 2 ||
    !booking.city ||
    digits.length < 10 ||
    !ISO_DATE.test(booking.start) ||
    !ISO_DATE.test(booking.end) ||
    booking.end < booking.start
  ) {
    return res.status(400).json({ ok: false, error: 'Some booking details are missing.' })
  }

  await redis('HSET', KEY, booking.id, JSON.stringify(booking))

  // Ping the owner's phone. A notification problem never blocks the booking.
  try {
    const range = booking.start === booking.end ? shortDay(booking.start) : `${shortDay(booking.start)} – ${shortDay(booking.end)}`
    await notifyAdmins({
      title: 'New booking request',
      body: `${booking.name} · ${range} · ${booking.passengers} pax`,
      url: '/admin',
      tag: booking.id,
    })
  } catch (err) {
    console.error('Notification failed', err)
  }

  return res.status(200).json({ ok: true, id: booking.id })
}

function shortDay(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}
