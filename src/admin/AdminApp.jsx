import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminRequest, getSavedKey, saveKey } from './api.js'
import { dayCount, parseISO, shortDate, timeAgo, toISO, todayISO } from './dates.js'
import { currentSubscription, disablePush, enablePush, isIOS, isStandalone, pushSupported, registerWorker, sendTestPush } from './push.js'

const STATUS = {
  new: { label: 'New', badge: 'bg-amber-100 text-amber-800', pill: 'bg-amber-400 text-amber-950' },
  confirmed: { label: 'Confirmed', badge: 'bg-emerald-100 text-emerald-800', pill: 'bg-emerald-600 text-white' },
  completed: { label: 'Done', badge: 'bg-stone-200 text-stone-700', pill: 'bg-stone-400 text-white' },
  cancelled: { label: 'Cancelled', badge: 'bg-red-100 text-red-800', pill: 'bg-red-200 text-red-900' },
}

const FILTERS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'new', label: 'New' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'completed', label: 'Done' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'all', label: 'All' },
]

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const telHref = (contact) => `tel:${contact.replace(/[^\d+]/g, '')}`
const smsHref = (contact) => `sms:${contact.replace(/[^\d+]/g, '')}`

function Icon({ name, className = 'h-5 w-5' }) {
  const paths = {
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
    trash: (
      <>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </>
    ),
    list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5M21 12H9" />
      </>
    ),
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

export default function AdminApp() {
  const [key, setKey] = useState(getSavedKey)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState('calendar')

  const load = useCallback(async (k = key) => {
    if (!k) return
    setLoading(true)
    setError('')
    try {
      const data = await adminRequest(k, 'GET')
      setBookings(data.bookings)
    } catch (err) {
      if (err.status === 401) {
        saveKey('')
        setKey('')
      }
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [key])

  useEffect(() => {
    load()
    // Refresh when the owner comes back to the app.
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  const updateBooking = async (id, changes) => {
    const before = bookings
    setBookings((list) => list.map((b) => (b.id === id ? { ...b, ...changes } : b)))
    try {
      await adminRequest(key, 'PATCH', { id, body: changes })
    } catch (err) {
      setBookings(before)
      setError(err.message)
    }
  }

  const deleteBooking = async (booking) => {
    if (!window.confirm(`Delete the booking from ${booking.name}? This cannot be undone.`)) return
    const before = bookings
    setBookings((list) => list.filter((b) => b.id !== booking.id))
    try {
      await adminRequest(key, 'DELETE', { id: booking.id })
    } catch (err) {
      setBookings(before)
      setError(err.message)
    }
  }

  const logout = () => {
    saveKey('')
    setKey('')
    setBookings([])
  }

  if (!key) {
    return (
      <Login
        error={error}
        onLogin={(k) => {
          saveKey(k)
          setKey(k)
          load(k)
        }}
      />
    )
  }

  const newCount = bookings.filter((b) => b.status === 'new').length
  const today = todayISO()
  const upcomingCount = bookings.filter((b) => b.end >= today && b.status !== 'cancelled' && b.status !== 'completed').length

  return (
    <div className="min-h-dvh bg-stone-100 pb-[env(safe-area-inset-bottom)]">
      <header className="bg-brand px-4 pb-5 text-white" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/alika-logo.png" alt="" className="h-12 w-12 rounded-xl object-cover" />
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-white/70">Alika Admin</p>
              <h1 className="text-xl font-bold leading-tight">Bookings</h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => load()} aria-label="Refresh bookings" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10">
              <Icon name="refresh" className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={logout} aria-label="Sign out" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10">
              <Icon name="logout" />
            </button>
          </div>
        </div>

        <div className="mx-auto mt-4 grid max-w-5xl grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <p className="text-3xl font-bold">{newCount}</p>
            <p className="text-sm text-white/80">New request{newCount === 1 ? '' : 's'}</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <p className="text-3xl font-bold">{upcomingCount}</p>
            <p className="text-sm text-white/80">Upcoming</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-4">
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-stone-200 p-1" role="tablist" aria-label="View">
          {[
            ['calendar', 'Calendar'],
            ['list', 'List'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${view === id ? 'bg-white text-brand shadow-sm' : 'text-stone-600'}`}
            >
              <Icon name={id === 'calendar' ? 'calendar' : 'list'} className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <NotificationsCard adminKey={key} />

        {error && (
          <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200" role="alert">
            {error}
          </div>
        )}

        {view === 'calendar' ? (
          <CalendarView bookings={bookings} onUpdate={updateBooking} onDelete={deleteBooking} />
        ) : (
          <ListView bookings={bookings} loading={loading} onUpdate={updateBooking} onDelete={deleteBooking} />
        )}
      </main>
    </div>
  )
}

function NotificationsCard({ adminKey }) {
  // 'checking' | 'install' | 'unsupported' | 'off' | 'on' | 'blocked'
  const [state, setState] = useState('checking')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (isIOS() && !isStandalone()) return !cancelled && setState('install')
      if (!pushSupported()) return !cancelled && setState('unsupported')
      await registerWorker()
      if (Notification.permission === 'denied') return !cancelled && setState('blocked')
      const sub = await currentSubscription()
      if (!cancelled) setState(sub && Notification.permission === 'granted' ? 'on' : 'off')
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const run = async (action, done) => {
    setBusy(true)
    setMessage('')
    try {
      await action()
      done?.()
    } catch (err) {
      setMessage(err.message)
      if (Notification.permission === 'denied') setState('blocked')
    } finally {
      setBusy(false)
    }
  }

  if (state === 'checking' || state === 'unsupported') return null

  const box = 'mb-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-200'

  if (state === 'install') {
    return (
      <div className={box}>
        <p className="flex items-center gap-2 font-semibold text-brand-ink"><Icon name="bell" className="h-5 w-5 text-brand" /> Get notified of new bookings</p>
        <p className="mt-1 text-sm text-stone-600">In Safari, tap <strong>Share</strong> › <strong>Add to Home Screen</strong>, then open <strong>Alika Admin</strong> from your home screen to turn on notifications.</p>
      </div>
    )
  }

  return (
    <div className={box}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold text-brand-ink">
            <Icon name="bell" className="h-5 w-5 text-brand" />
            Notifications {state === 'on' ? 'on' : state === 'blocked' ? 'blocked' : 'off'}
          </p>
          <p className="mt-0.5 text-sm text-stone-500">
            {state === 'on'
              ? 'This phone gets an alert for every new booking.'
              : state === 'blocked'
                ? 'Allow them in iPhone Settings › Notifications › Alika Admin.'
                : 'Get an alert on this phone for every new booking.'}
          </p>
        </div>
        {state === 'off' && (
          <button type="button" disabled={busy} onClick={() => run(() => enablePush(adminKey), () => setState('on'))} className="h-11 shrink-0 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60">
            {busy ? 'Turning on...' : 'Turn on'}
          </button>
        )}
      </div>
      {state === 'on' && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => run(() => sendTestPush(adminKey), () => setMessage('Test sent. It should arrive in a few seconds.'))} className="h-11 rounded-xl border-2 border-brand text-sm font-semibold text-brand transition hover:bg-brand-soft disabled:opacity-60">
            Send test
          </button>
          <button type="button" disabled={busy} onClick={() => run(() => disablePush(adminKey), () => setState('off'))} className="h-11 rounded-xl text-sm font-semibold text-stone-600 ring-1 ring-stone-300 transition hover:bg-stone-50 disabled:opacity-60">
            Turn off
          </button>
        </div>
      )}
      {message && <p className="mt-2 text-sm text-stone-600" role="status">{message}</p>}
    </div>
  )
}

function Login({ onLogin, error }) {
  const [value, setValue] = useState('')
  return (
    <div className="flex min-h-dvh items-center justify-center bg-brand px-5" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (value.trim()) onLogin(value.trim())
        }}
        className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl"
      >
        <img src="/alika-logo.png" alt="Alika Cars" className="mx-auto h-28 w-28 rounded-2xl object-cover" />
        <h1 className="mt-4 text-2xl font-bold text-brand-ink">Admin sign in</h1>
        <p className="mt-1 text-sm text-stone-500">Enter the admin password to see bookings.</p>
        <label htmlFor="admin-password" className="sr-only">Admin password</label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Password"
          className="mt-5 block w-full rounded-xl border border-stone-300 px-4 py-3 text-base outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
        />
        {error && <p className="mt-2 text-sm font-medium text-brand" role="alert">{error}</p>}
        <button type="submit" className="mt-4 h-12 w-full rounded-xl bg-brand font-semibold text-white transition hover:bg-brand-dark">
          Sign in
        </button>
      </form>
    </div>
  )
}

function CalendarView({ bookings, onUpdate, onDelete }) {
  const today = todayISO()
  const now = new Date()
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [selected, setSelected] = useState(today)

  const active = useMemo(() => bookings.filter((b) => b.status !== 'cancelled'), [bookings])

  const cells = useMemo(() => {
    const y = month.getFullYear()
    const m = month.getMonth()
    const offset = new Date(y, m, 1).getDay()
    const total = new Date(y, m + 1, 0).getDate()
    const list = Array.from({ length: offset }, () => null)
    for (let d = 1; d <= total; d++) {
      const iso = toISO(new Date(y, m, d))
      list.push({ iso, day: d, items: active.filter((b) => b.start <= iso && iso <= b.end) })
    }
    return list
  }, [month, active])

  const dayBookings = bookings.filter((b) => b.start <= selected && selected <= b.end)

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-stone-200 sm:p-5">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" aria-label="Previous month" onClick={() => setMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="flex h-11 w-11 items-center justify-center rounded-full text-brand-ink hover:bg-brand-soft">
            <Icon name="left" />
          </button>
          <div className="text-center">
            <p className="font-semibold text-brand-ink">{month.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</p>
            <button
              type="button"
              onClick={() => {
                setMonth(new Date(now.getFullYear(), now.getMonth(), 1))
                setSelected(today)
              }}
              className="text-xs font-medium text-brand"
            >
              Today
            </button>
          </div>
          <button type="button" aria-label="Next month" onClick={() => setMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="flex h-11 w-11 items-center justify-center rounded-full text-brand-ink hover:bg-brand-soft">
            <Icon name="right" />
          </button>
        </div>

        <div className="grid grid-cols-7 text-center text-xs font-medium text-stone-500">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="pb-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (!cell) return <div key={`e${i}`} />
            const isSelected = cell.iso === selected
            const isToday = cell.iso === today
            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() => setSelected(cell.iso)}
                aria-label={`${shortDate(cell.iso)}, ${cell.items.length} booking${cell.items.length === 1 ? '' : 's'}`}
                aria-pressed={isSelected}
                className={`flex min-h-16 flex-col items-stretch gap-0.5 rounded-xl p-1 text-left transition sm:min-h-24 sm:p-1.5 ${isSelected ? 'bg-brand-soft ring-2 ring-brand' : 'hover:bg-stone-50'}`}
              >
                <span className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-xs sm:mx-0 sm:text-sm ${isToday ? 'bg-brand font-semibold text-white' : 'text-stone-700'}`}>
                  {cell.day}
                </span>
                {cell.items.slice(0, 2).map((b) => (
                  <span key={b.id} className={`truncate rounded px-1 text-[10px] font-medium leading-4 sm:text-xs ${STATUS[b.status]?.pill || STATUS.new.pill}`}>
                    {b.name.split(' ')[0]}
                  </span>
                ))}
                {cell.items.length > 2 && <span className="px-1 text-[10px] font-medium text-stone-500">+{cell.items.length - 2} more</span>}
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-3 px-1 text-xs text-stone-600">
          {['new', 'confirmed', 'completed'].map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded ${STATUS[s].pill}`} aria-hidden="true" />
              {STATUS[s].label}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 px-1 text-base font-semibold text-brand-ink">{shortDate(selected)}</h2>
        {dayBookings.length === 0 ? (
          <p className="rounded-3xl bg-white px-4 py-8 text-center text-sm text-stone-500 ring-1 ring-stone-200">No bookings on this day.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {dayBookings.map((b) => (
              <BookingCard key={b.id} booking={b} onUpdate={onUpdate} onDelete={onDelete} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ListView({ bookings, loading, onUpdate, onDelete }) {
  const [filter, setFilter] = useState('upcoming')
  const [query, setQuery] = useState('')
  const today = todayISO()

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return bookings
      .filter((b) => {
        if (filter === 'upcoming') return b.end >= today && b.status !== 'cancelled' && b.status !== 'completed'
        if (filter === 'all') return true
        return b.status === filter
      })
      .filter((b) => !q || `${b.name} ${b.contact} ${b.city}`.toLowerCase().includes(q))
  }, [bookings, filter, query, today])

  return (
    <div className="space-y-3">
      <label htmlFor="search" className="sr-only">Search bookings</label>
      <input
        id="search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, number or city"
        className="block w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
      />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-medium transition ${filter === f.id ? 'bg-brand text-white' : 'bg-white text-stone-700 ring-1 ring-stone-300'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-3xl bg-white px-4 py-10 text-center text-sm text-stone-500 ring-1 ring-stone-200">
          {loading ? 'Loading bookings...' : 'No bookings here yet.'}
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {shown.map((b) => (
            <BookingCard key={b.id} booking={b} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

function BookingCard({ booking: b, onUpdate, onDelete }) {
  const [notes, setNotes] = useState(b.notes || '')
  const days = dayCount(b.start, b.end)
  const status = STATUS[b.status] || STATUS.new

  useEffect(() => setNotes(b.notes || ''), [b.notes])

  return (
    <article className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-brand-ink">{b.name}</h3>
          <p className="text-sm text-stone-500">
            {b.city} · {b.passengers} {b.passengers === 1 ? 'person' : 'people'}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${status.badge}`}>{status.label}</span>
      </div>

      <div className="mt-3 rounded-2xl bg-stone-50 px-4 py-3">
        <p className="font-semibold text-brand-ink">
          {shortDate(b.start)}
          {b.end !== b.start && <> → {shortDate(b.end)}</>}
        </p>
        <p className="text-sm text-stone-500">
          {days} day{days > 1 ? 's' : ''} · {parseISO(b.start).getFullYear()}
        </p>
      </div>

      {b.purposes?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {b.purposes.map((p) => (
            <span key={p} className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">{p}</span>
          ))}
        </div>
      )}

      {b.details && <p className="mt-3 whitespace-pre-wrap text-sm text-stone-700">{b.details}</p>}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <a href={telHref(b.contact)} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-white transition hover:bg-brand-dark">
          <Icon name="phone" className="h-5 w-5" />
          Call
        </a>
        <a href={smsHref(b.contact)} className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-brand font-semibold text-brand transition hover:bg-brand-soft">
          <Icon name="message" className="h-5 w-5" />
          Text
        </a>
      </div>
      <p className="mt-2 text-center text-sm text-stone-500">{b.contact}</p>

      <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-2">
        <div>
          <label htmlFor={`status-${b.id}`} className="mb-1 block text-xs font-medium text-stone-500">Status</label>
          <select
            id={`status-${b.id}`}
            value={b.status}
            onChange={(e) => onUpdate(b.id, { status: e.target.value })}
            className="block h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-base outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
          >
            {Object.entries(STATUS).map(([id, s]) => (
              <option key={id} value={id}>{s.label}</option>
            ))}
          </select>
        </div>
        <button type="button" onClick={() => onDelete(b)} aria-label={`Delete booking from ${b.name}`} className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 ring-1 ring-stone-300 transition hover:bg-red-50 hover:text-red-700">
          <Icon name="trash" />
        </button>
      </div>

      <div className="mt-3">
        <label htmlFor={`notes-${b.id}`} className="mb-1 block text-xs font-medium text-stone-500">Notes (only you see these)</label>
        <textarea
          id={`notes-${b.id}`}
          rows="2"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (b.notes || '') && onUpdate(b.id, { notes })}
          placeholder="e.g. Downpayment received, car: Vios"
          className="block w-full resize-y rounded-xl border border-stone-300 px-3 py-2 text-base outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
        />
      </div>

      <p className="mt-3 text-xs text-stone-400">Requested {timeAgo(b.createdAt)}</p>
    </article>
  )
}
