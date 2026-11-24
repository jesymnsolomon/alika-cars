// Turns booking notifications on or off for this phone.
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

function base64ToBytes(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

async function pushRequest(key, method, body) {
  const res = await fetch('/api/push', {
    method,
    headers: { 'x-admin-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export async function registerWorker() {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch {
    return null
  }
}

export async function currentSubscription() {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.getRegistration('/')
  return reg ? reg.pushManager.getSubscription() : null
}

export async function enablePush(key) {
  // Must be the first await so iPhone sees it as a direct tap.
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notifications were blocked. Turn them on in iPhone Settings › Notifications › Alika Admin.')
  }
  const { publicKey } = await fetch('/api/push').then((r) => r.json())
  if (!publicKey) throw new Error('Notifications are not set up on the server yet (missing VAPID keys in Vercel).')

  const reg = (await registerWorker()) || (await navigator.serviceWorker.ready)
  await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(publicKey) })
  await pushRequest(key, 'POST', { subscription: sub.toJSON() })
}

export async function disablePush(key) {
  const sub = await currentSubscription()
  if (!sub) return
  await pushRequest(key, 'DELETE', { endpoint: sub.endpoint }).catch(() => {})
  await sub.unsubscribe()
}

export async function sendTestPush(key) {
  return pushRequest(key, 'POST', { test: true })
}
