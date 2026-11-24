// Push notification settings.
//   GET    /api/push                         public key the phone needs to subscribe
//   POST   /api/push { subscription }        admin: save this phone
//   POST   /api/push { test: true }          admin: send a test notification
//   DELETE /api/push { endpoint }            admin: forget this phone
import { redis, redisReady, isAdmin, readBody } from './_redis.js'
import { SUBS_KEY, notifyAdmins, pushReady, subscriptionId } from './_push.js'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, ready: pushReady, publicKey: process.env.VAPID_PUBLIC_KEY || '' })
  }
  if (!redisReady) return res.status(500).json({ ok: false, error: 'Database not connected.' })
  if (!isAdmin(req)) return res.status(401).json({ ok: false, error: 'Wrong password.' })
  if (!pushReady) return res.status(500).json({ ok: false, error: 'Notifications are not set up yet (missing VAPID keys in Vercel).' })

  const body = readBody(req)
  try {
    if (req.method === 'POST' && body.test) {
      const { sent } = await notifyAdmins({ title: 'Alika Admin', body: 'Notifications are working! 🚗', url: '/admin', tag: 'test' })
      return res.status(200).json({ ok: true, sent })
    }

    if (req.method === 'POST') {
      const sub = body.subscription
      if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
        return res.status(400).json({ ok: false, error: 'Invalid subscription.' })
      }
      const clean = { endpoint: String(sub.endpoint), keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) } }
      await redis('HSET', SUBS_KEY, subscriptionId(clean.endpoint), JSON.stringify(clean))
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'DELETE') {
      if (body.endpoint) await redis('HDEL', SUBS_KEY, subscriptionId(String(body.endpoint)))
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, POST, DELETE')
    return res.status(405).json({ ok: false, error: 'Method not allowed.' })
  } catch (err) {
    console.error('Push API error', err)
    return res.status(500).json({ ok: false, error: 'Server error.' })
  }
}
