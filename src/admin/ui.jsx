// Small shared pieces for the admin dashboard.

export const STATUS = {
  new: { label: 'New', pill: 'bg-amber-100 text-amber-800', dot: 'bg-amber-400', bar: 'bg-amber-300 text-amber-950' },
  confirmed: { label: 'Confirmed', pill: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500', bar: 'bg-emerald-500 text-white' },
  completed: { label: 'Done', pill: 'bg-stone-200 text-stone-700', dot: 'bg-stone-400', bar: 'bg-stone-300 text-stone-800' },
  cancelled: { label: 'Cancelled', pill: 'bg-red-100 text-red-700', dot: 'bg-red-300', bar: 'bg-red-200 text-red-900' },
}

// Where the car is for this booking.
export const VEHICLE_STATUS = {
  waiting: { label: 'Not picked up', short: 'Waiting', pill: 'bg-stone-100 text-stone-600', icon: 'clock' },
  out: { label: 'Picked up', short: 'With customer', pill: 'bg-sky-100 text-sky-800', icon: 'key' },
  returned: { label: 'Returned', short: 'Returned', pill: 'bg-emerald-100 text-emerald-800', icon: 'check' },
  unwashed: { label: 'Returned unwashed', short: 'Needs washing', pill: 'bg-orange-100 text-orange-800', icon: 'drop' },
}

export const telHref = (contact) => `tel:${String(contact).replace(/[^\d+]/g, '')}`
export const smsHref = (contact) => `sms:${String(contact).replace(/[^\d+]/g, '')}`

const PATHS = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  settings: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />,
  message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 3v6h-6" />
    </>
  ),
  left: <path d="M15 18l-6-6 6-6" />,
  right: <path d="M9 18l6-6-6-6" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </>
  ),
  share: (
    <>
      <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
      <path d="M16 6l-4-4-4 4M12 2v13" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  drop: <path d="M12 2.7s6 6.3 6 11.3a6 6 0 0 1-12 0c0-5 6-11.3 6-11.3z" />,
  key: (
    <>
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="M21 2l-9.6 9.6M15.5 7.5l3 3L22 7l-3-3" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
}

export function Icon({ name, className = 'h-5 w-5', strokeWidth = 2 }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}

const AVATAR_TONES = ['bg-rose-100 text-rose-700', 'bg-amber-100 text-amber-800', 'bg-emerald-100 text-emerald-800', 'bg-sky-100 text-sky-800', 'bg-violet-100 text-violet-800', 'bg-orange-100 text-orange-800']

export function Avatar({ name, size = 'h-11 w-11 text-sm' }) {
  const initials = String(name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  let hash = 0
  for (const ch of String(name)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-2xl font-semibold ${size} ${AVATAR_TONES[hash % AVATAR_TONES.length]}`} aria-hidden="true">
      {initials}
    </span>
  )
}

export function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.new
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${s.pill}`}>{s.label}</span>
}
