// Push notifications to the owner's phone (Web Push). Needs VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.
import { createHash } from 'node:crypto'
import { redis } from './_redis.js'

export const SUBS_KEY = 'push_subs'
export const pushReady = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)

export const subscriptionId = (endpoint) => createHash('sha256').update(endpoint).digest('hex').slice(0, 32)

// Sends one notification to every phone that turned notifications on.
export async function notifyAdmins(payload) {
  if (!pushReady) return { sent: 0 }
  const { default: webpush } = await import('web-push')
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:alikacars.baguio@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )

  const flat = (await redis('HGETALL', SUBS_KEY)) || []
  let sent = 0
  const jobs = []
  for (let i = 0; i < flat.length; i += 2) {
    const field = flat[i]
    let subscription
    try {
      subscription = JSON.parse(flat[i + 1])
    } catch {
      continue
    }
    jobs.push(
      webpush
        .sendNotification(subscription, JSON.stringify(payload), { TTL: 86400, urgency: 'high' })
        .then(() => {
          sent += 1
        })
        .catch(async (err) => {
          // 404/410: the phone turned notifications off or removed the app.
          if (err.statusCode === 404 || err.statusCode === 410) await redis('HDEL', SUBS_KEY, field)
          else console.error('Push failed', err.statusCode, err.body)
        }),
    )
  }
  await Promise.allSettled(jobs)
  return { sent }
}
