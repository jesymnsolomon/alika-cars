// Vercel serverless function: texts each new booking to Alika's phone through Semaphore.
// The Semaphore API key lives only in Vercel's environment variables, never in the web page.

const SEMAPHORE_URL = 'https://api.semaphore.co/api/v4/messages'

const clean = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const apiKey = process.env.SEMAPHORE_API_KEY
  const to = process.env.ALIKA_SMS_TO || '09291805772'
  const sender = process.env.SEMAPHORE_SENDER_NAME // optional, must be approved by Semaphore
  if (!apiKey) return res.status(500).json({ ok: false, error: 'SMS is not set up yet (missing SEMAPHORE_API_KEY).' })

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {}

  // Bots fill hidden fields; real customers never see it.
  if (body.botcheck) return res.status(200).json({ ok: true })

  const b = {
    name: clean(body.name, 60),
    city: clean(body.city, 40),
    contact: clean(body.contact, 20),
    start: clean(body.start, 30),
    end: clean(body.end, 30),
    days: clean(body.days, 3),
    passengers: clean(body.passengers, 3),
    purpose: clean(body.purpose, 80),
    details: clean(body.details, 160),
  }

  const digits = b.contact.replace(/\D/g, '')
  if (b.name.length < 2 || digits.length < 10 || !b.start || !b.end) {
    return res.status(400).json({ ok: false, error: 'Missing booking details.' })
  }

  // Kept short on purpose: Semaphore charges per 160 characters.
  const message = [
    'ALIKA BOOKING',
    `${b.name} (${b.contact})`,
    `${b.start} - ${b.end}, ${b.days}d`,
    `${b.passengers} pax, from ${b.city}`,
    `For: ${b.purpose}`,
    `Details: ${b.details}`,
  ].join('\n')

  const params = new URLSearchParams({ apikey: apiKey, number: to, message })
  if (sender) params.set('sendername', sender)

  try {
    const r = await fetch(SEMAPHORE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })
    const data = await r.json().catch(() => null)
    // Semaphore answers with a list of queued messages on success.
    const ok = r.ok && Array.isArray(data) && data.length > 0 && !data[0]?.error
    if (!ok) {
      console.error('Semaphore error', r.status, JSON.stringify(data))
      return res.status(502).json({ ok: false, error: 'SMS provider rejected the message.' })
    }
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Semaphore request failed', err)
    return res.status(502).json({ ok: false, error: 'Could not reach the SMS provider.' })
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}
