// Talks to /api/bookings with the admin password the owner typed in.
const STORAGE_KEY = 'alika-admin-key'

export function getSavedKey() {
  try {
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export function saveKey(key) {
  try {
    if (key) localStorage.setItem(STORAGE_KEY, key)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* private mode: stays signed in until the app closes */
  }
}

export async function adminRequest(key, method = 'GET', { id, body } = {}) {
  const url = id ? `/api/bookings?id=${encodeURIComponent(id)}` : '/api/bookings'
  const res = await fetch(url, {
    method,
    headers: { 'x-admin-key': key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.ok) {
    const error = new Error(data.error || `Request failed (${res.status})`)
    error.status = res.status
    throw error
  }
  return data
}
