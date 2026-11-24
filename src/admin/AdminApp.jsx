import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { adminRequest, getSavedKey, saveKey } from './api.js'
import { greeting, rangeText, shortDate, timeAgo, toISO, todayISO } from './dates.js'
import { currentSubscription, disablePush, enablePush, isIOS, isStandalone, pushSupported, registerWorker, sendTestPush } from './push.js'
import { Avatar, Icon, STATUS, StatusPill, VEHICLE_STATUS, telHref } from './ui.jsx'
import BookingSheet from './BookingSheet.jsx'
import { BUSINESS } from '../config.js'

const NAV = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'bookings', label: 'Bookings', icon: 'list' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]
const SEEN_KEY = 'alika-admin-seen'
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const readSeen = () => {
  try {
    return localStorage.getItem(SEEN_KEY) || ''
  } catch {
    return ''
  }
}
const writeSeen = (v) => {
  try {
    localStorage.setItem(SEEN_KEY, v)
  } catch {
    /* ignore */
  }
}

const isActive = (b) => b.status !== 'cancelled' && b.status !== 'completed'

export default function AdminApp() {
  const [key, setKey] = useState(getSavedKey)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState('home')
  const [openId, setOpenId] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [seen, setSeen] = useState(readSeen)
  const [panelSince, setPanelSince] = useState('')
  const [toasts, setToasts] = useState([])
  const known = useRef(null)

  const addToast = useCallback((booking) => {
    const id = `${booking.id}-${Date.now()}`
    setToasts((t) => [...t.slice(-2), { id, booking }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 7000)
  }, [])

  const load = useCallback(
    async (k = key) => {
      if (!k) return
      setLoading(true)
      try {
        const data = await adminRequest(k, 'GET')
        // Pop up anything that arrived since the last check.
        if (known.current) data.bookings.filter((b) => !known.current.has(b.id)).forEach(addToast)
        known.current = new Set(data.bookings.map((b) => b.id))
        setBookings(data.bookings)
        setError('')
      } catch (err) {
        if (err.status === 401) {
          saveKey('')
          setKey('')
        }
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [key, addToast],
  )

  useEffect(() => {
    load()
    const tick = () => document.visibilityState === 'visible' && load()
    const timer = setInterval(tick, 30000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
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
    setOpenId(null)
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
    known.current = null
  }

  const openPanel = () => {
    if (panelOpen) return setPanelOpen(false)
    // Remember what was unread so the panel can highlight it, then clear the badge.
    const now = new Date().toISOString()
    setPanelSince(seen)
    setSeen(now)
    writeSeen(now)
    setPanelOpen(true)
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

  const unread = bookings.filter((b) => b.createdAt > seen).length
  const open = bookings.find((b) => b.id === openId)

  return (
    <div className="min-h-dvh overflow-x-clip bg-canvas text-ink lg:flex lg:gap-5 lg:p-5">
      <Sidebar page={page} setPage={setPage} onLogout={logout} newCount={bookings.filter((b) => b.status === 'new').length} />

      <div className="min-w-0 flex-1 pb-32 lg:pb-0">
        <TopBar page={page} unread={unread} panelOpen={panelOpen} onBell={openPanel} onRefresh={() => load()} loading={loading} />

        {panelOpen && (
          <NotificationPanel
            bookings={bookings}
            lastSeen={panelSince}
            onClose={() => setPanelOpen(false)}
            onOpen={(id) => {
              setOpenId(id)
              setPanelOpen(false)
            }}
          />
        )}

        <main className="px-4 sm:px-6 lg:px-0">
          {error && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} aria-label="Dismiss" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-red-100">
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          )}

          {page === 'home' && <HomePage bookings={bookings} onOpen={setOpenId} goBookings={() => setPage('bookings')} />}
          {page === 'bookings' && <BookingsPage bookings={bookings} loading={loading} onOpen={setOpenId} />}
          {page === 'settings' && <SettingsPage adminKey={key} onLogout={logout} />}
        </main>
      </div>

      <BottomNav page={page} setPage={setPage} />

      {open && <BookingSheet booking={open} onClose={() => setOpenId(null)} onUpdate={updateBooking} onDelete={deleteBooking} />}

      <Toasts
        toasts={toasts}
        onOpen={(id) => setOpenId(id)}
        onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))}
      />
    </div>
  )
}

/* ---------- Navigation ---------- */

function Sidebar({ page, setPage, onLogout, newCount }) {
  return (
    <aside className="sticky top-5 hidden h-[calc(100dvh-2.5rem)] w-64 shrink-0 flex-col rounded-[2rem] bg-ink p-5 text-white lg:flex">
      <div className="flex items-center gap-3 px-2">
        <img src="/alika-logo.png" alt="" className="h-11 w-11 rounded-xl object-cover" />
        <div>
          <p className="text-lg font-bold leading-tight">Alika</p>
          <p className="text-xs text-white/50">Admin</p>
        </div>
      </div>
      <nav className="mt-8 space-y-1" aria-label="Main">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPage(item.id)}
            aria-current={page === item.id ? 'page' : undefined}
            className={`flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-sm font-medium transition ${page === item.id ? 'bg-brand text-white shadow-lg shadow-black/20' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
          >
            <Icon name={item.icon} className="h-5 w-5" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.id === 'bookings' && newCount > 0 && (
              <span className="rounded-full bg-amber-300 px-2 py-0.5 text-xs font-bold text-amber-950">{newCount}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="mt-auto space-y-3">
        <ShareCard compact />
        <button type="button" onClick={onLogout} className="flex h-11 w-full items-center gap-3 rounded-2xl px-4 text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white">
          <Icon name="logout" className="h-5 w-5" /> Sign out
        </button>
      </div>
    </aside>
  )
}

function BottomNav({ page, setPage }) {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-between gap-1 rounded-[1.75rem] bg-ink p-2 shadow-2xl shadow-ink/30">
        {NAV.map((item) => {
          const active = page === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setPage(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-[1.25rem] text-sm font-semibold transition ${active ? 'bg-brand text-white' : 'text-white/60'}`}
            >
              <Icon name={item.icon} className="h-5 w-5" />
              {active && <span>{item.label}</span>}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function TopBar({ page, unread, panelOpen, onBell, onRefresh, loading }) {
  const titles = { home: `${greeting()}, ${BUSINESS.ownerName}`, bookings: 'Bookings', settings: 'Settings' }
  const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })
  return (
    <header className="flex items-center justify-between gap-3 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 lg:px-0 lg:pt-1">
      <div className="flex min-w-0 items-center gap-3">
        <img src="/alika-logo.png" alt="" className="h-11 w-11 shrink-0 rounded-2xl object-cover lg:hidden" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-stone-500">{today}</p>
          <h1 className="truncate text-xl font-bold tracking-tight text-ink sm:text-2xl">
            {titles[page]}
            {page === 'home' && <span aria-hidden="true"> 👋</span>}
          </h1>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={onRefresh} aria-label="Refresh" className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-white text-stone-600 shadow-sm ring-1 ring-stone-200/70 hover:text-ink sm:flex">
          <Icon name="refresh" className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button
          type="button"
          onClick={onBell}
          aria-label={`Notifications${unread ? `, ${unread} new` : ''}`}
          aria-expanded={panelOpen}
          className={`relative flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm ring-1 transition ${panelOpen ? 'bg-ink text-white ring-ink' : 'bg-white text-stone-700 ring-stone-200/70'}`}
        >
          <Icon name="bell" className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white ring-2 ring-canvas">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}

/* ---------- Notifications ---------- */

function NotificationPanel({ bookings, lastSeen, onClose, onOpen }) {
  const recent = [...bookings].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 15)
  const ref = useRef(null)

  useEffect(() => {
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && !e.target.closest('[aria-expanded]') && onClose()
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Notifications"
      className="fixed inset-x-3 top-[calc(max(1rem,env(safe-area-inset-top))+3.75rem)] z-40 max-h-[70dvh] overflow-hidden rounded-[1.75rem] bg-white shadow-2xl ring-1 ring-stone-200 animate-[pop-in_.2s_ease-out] sm:left-auto sm:right-6 sm:w-96 lg:right-5 lg:top-20"
    >
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
        <p className="font-semibold text-ink">Notifications</p>
        <button type="button" onClick={onClose} aria-label="Close notifications" className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100">
          <Icon name="x" className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-[calc(70dvh-4rem)] space-y-2 overflow-y-auto p-3">
        {recent.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-stone-500">No booking requests yet.</p>
        ) : (
          recent.map((b) => {
            const fresh = b.createdAt > lastSeen
            return (
              <button key={b.id} type="button" onClick={() => onOpen(b.id)} className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-canvas ${fresh ? 'bg-brand-soft/60' : ''}`}>
                <Avatar name={b.name} size="h-10 w-10 text-sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-ink">
                    <strong className="font-semibold">{b.name}</strong> requested a booking
                  </span>
                  <span className="mt-0.5 block text-xs text-stone-500">
                    {rangeText(b)} · {b.passengers} pax · {timeAgo(b.createdAt)}
                  </span>
                </span>
                {fresh && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" aria-label="New" />}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function Toasts({ toasts, onOpen, onDismiss }) {
  return (
    <div className="pointer-events-none fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end" aria-live="polite">
      {toasts.map(({ id, booking: b }) => (
        <div key={id} className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-[1.5rem] bg-ink p-3 pr-2 text-white shadow-2xl animate-[pop-in_.25s_ease-out]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand">
            <Icon name="bell" className="h-5 w-5" />
          </span>
          <button
            type="button"
            onClick={() => {
              onOpen(b.id)
              onDismiss(id)
            }}
            className="min-w-0 flex-1 text-left"
          >
            <span className="block text-sm font-semibold">New booking request</span>
            <span className="block truncate text-xs text-white/70">
              {b.name} · {rangeText(b)} · {b.passengers} pax
            </span>
          </button>
          <button type="button" onClick={() => onDismiss(id)} aria-label="Dismiss" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/60 hover:bg-white/10">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

/* ---------- Home ---------- */

function HomePage({ bookings, onOpen, goBookings }) {
  const today = todayISO()
  const [selected, setSelected] = useState(today)
  const newOnes = bookings.filter((b) => b.status === 'new').sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  const upcoming = bookings.filter((b) => b.end >= today && isActive(b))
  const onTheRoad = bookings.filter((b) => b.start <= today && today <= b.end && b.status === 'confirmed')
  const dayList = bookings.filter((b) => b.start <= selected && selected <= b.end && b.status !== 'cancelled')

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-5">
        <TodaySummary bookings={bookings} onOpen={onOpen} />

        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
          <StatCard tone="dark" label="New requests" value={newOnes.length} hint="Waiting for your reply" onClick={goBookings} />
          <StatCard label="Upcoming" value={upcoming.length} hint="Active bookings ahead" />
          <StatCard label="On the road" value={onTheRoad.length} hint="Confirmed for today" />
        </div>

        <CalendarCard bookings={bookings} selected={selected} setSelected={setSelected} />

        <section className="lg:hidden">
          <DaySchedule day={selected} list={dayList} onOpen={onOpen} />
        </section>
      </div>

      <div className="space-y-5">
        <section className="hidden lg:block">
          <DaySchedule day={selected} list={dayList} onOpen={onOpen} />
        </section>

        <section className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-stone-200/70 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">New requests</h2>
            <button type="button" onClick={goBookings} className="text-sm font-medium text-brand">See all</button>
          </div>
          {newOnes.length === 0 ? (
            <p className="rounded-2xl bg-canvas px-4 py-6 text-center text-sm text-stone-500">You're all caught up 🎉</p>
          ) : (
            <div className="space-y-2">
              {newOnes.slice(0, 4).map((b) => (
                <BookingRow key={b.id} booking={b} onOpen={onOpen} compact />
              ))}
            </div>
          )}
        </section>

        <div className="lg:hidden">
          <ShareCard />
        </div>
      </div>
    </div>
  )
}

const firstName = (name) => name.trim().split(/\s+/)[0]
const carText = (b) => (b.vehicle ? `the ${b.vehicle}` : 'a car')

function TodaySummary({ bookings, onOpen }) {
  const today = todayISO()
  const vs = (b) => b.vehicleStatus || 'waiting'
  const pickups = bookings.filter((b) => b.start === today && (b.status === 'new' || b.status === 'confirmed'))
  const returns = bookings.filter((b) => b.end === today && b.start !== today && b.status !== 'cancelled' && b.status !== 'new')
  const toWash = bookings.filter((b) => vs(b) === 'unwashed' && !(b.end === today && b.start !== today))
  const name = (b) => <strong className="font-semibold text-ink">{firstName(b.name)}</strong>
  const lines = [
    ...pickups.map((b) => ({
      b,
      tone: vs(b) === 'waiting' ? 'brand' : 'done',
      icon: vs(b) === 'waiting' ? 'key' : 'check',
      text:
        vs(b) === 'waiting' ? (
          <>
            {name(b)} is expected to get {carText(b)} today
            {b.status === 'new' && <span className="text-amber-700"> · not confirmed yet</span>}
          </>
        ) : (
          <>
            {name(b)} picked up {carText(b)}
          </>
        ),
    })),
    ...returns.map((b) => ({
      b,
      tone: vs(b) === 'unwashed' ? 'wash' : vs(b) === 'returned' ? 'done' : 'return',
      icon: vs(b) === 'unwashed' ? 'drop' : vs(b) === 'returned' ? 'check' : 'refresh',
      text:
        vs(b) === 'returned' ? (
          <>
            {name(b)} returned {carText(b)}
          </>
        ) : vs(b) === 'unwashed' ? (
          <>
            {name(b)} returned {carText(b)} unwashed · <span className="text-orange-700">needs washing</span>
          </>
        ) : (
          <>
            {name(b)} is returning {carText(b)} today
          </>
        ),
    })),
    ...toWash.map((b) => ({
      b,
      tone: 'wash',
      icon: 'drop',
      text: (
        <>
          {b.vehicle ? <strong className="font-semibold text-ink">{b.vehicle}</strong> : 'A car'} needs washing · returned by {firstName(b.name)}
        </>
      ),
    })),
  ]
  const TONES = {
    brand: 'bg-brand-soft text-brand',
    return: 'bg-sky-50 text-sky-700',
    done: 'bg-emerald-50 text-emerald-700',
    wash: 'bg-orange-50 text-orange-700',
  }

  if (lines.length === 0) {
    return (
      <p className="flex items-center gap-3 rounded-[1.5rem] bg-white px-4 py-3.5 text-sm text-stone-600 shadow-sm ring-1 ring-stone-200/70">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-canvas text-stone-500">
          <Icon name="calendar" className="h-[18px] w-[18px]" />
        </span>
        You have no bookings to accommodate today.
      </p>
    )
  }

  return (
    <section aria-label="Today" className="rounded-[1.5rem] bg-white p-2 shadow-sm ring-1 ring-stone-200/70">
      <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-stone-500">Today</p>
      {lines.map(({ b, icon, tone, text }, i) => (
        <button key={`${b.id}-${i}`} type="button" onClick={() => onOpen(b.id)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm text-stone-600 transition hover:bg-canvas">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
            <Icon name={icon} className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">{text}</span>
          <Icon name="right" className="h-4 w-4 shrink-0 text-stone-300" />
        </button>
      ))}
    </section>
  )
}

function StatCard({ label, value, hint, tone, onClick }) {
  const dark = tone === 'dark'
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      className={`min-w-[10.5rem] snap-start rounded-[1.75rem] p-4 text-left sm:min-w-0 sm:p-5 ${dark ? 'bg-brand text-white shadow-lg shadow-brand/25' : 'bg-white text-ink shadow-sm ring-1 ring-stone-200/70'}`}
    >
      <p className={`text-sm font-medium ${dark ? 'text-white/80' : 'text-stone-500'}`}>{label}</p>
      <p className="mt-2 text-4xl font-bold tracking-tight">{value}</p>
      <p className={`mt-1 text-xs ${dark ? 'text-white/70' : 'text-stone-400'}`}>{hint}</p>
    </Tag>
  )
}

function CalendarCard({ bookings, selected, setSelected }) {
  const today = todayISO()
  const now = new Date()
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const visible = useMemo(() => bookings.filter((b) => b.status !== 'cancelled'), [bookings])

  const cells = useMemo(() => {
    const y = month.getFullYear()
    const m = month.getMonth()
    const offset = new Date(y, m, 1).getDay()
    const total = new Date(y, m + 1, 0).getDate()
    const list = Array.from({ length: offset }, () => null)
    for (let d = 1; d <= total; d++) {
      const iso = toISO(new Date(y, m, d))
      list.push({ iso, day: d, items: visible.filter((b) => b.start <= iso && iso <= b.end) })
    }
    return list
  }, [month, visible])

  const shift = (n) => setMonth((d) => new Date(d.getFullYear(), d.getMonth() + n, 1))

  return (
    <section className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-stone-200/70 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink">{month.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</h2>
          <p className="text-xs text-stone-500">Tap a day to see its bookings</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setMonth(new Date(now.getFullYear(), now.getMonth(), 1))
              setSelected(today)
            }}
            className="h-10 rounded-xl px-3 text-sm font-semibold text-brand hover:bg-brand-soft"
          >
            Today
          </button>
          <button type="button" aria-label="Previous month" onClick={() => shift(-1)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-ink hover:bg-stone-200">
            <Icon name="left" className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Next month" onClick={() => shift(1)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-ink hover:bg-stone-200">
            <Icon name="right" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-semibold text-stone-400">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="pb-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`e${i}`} />
          const isSel = cell.iso === selected
          const isToday = cell.iso === today
          const past = cell.iso < today
          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => setSelected(cell.iso)}
              aria-pressed={isSel}
              aria-label={`${shortDate(cell.iso)}, ${cell.items.length} booking${cell.items.length === 1 ? '' : 's'}`}
              className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl text-sm font-semibold transition lg:aspect-auto lg:min-h-24 lg:items-stretch lg:justify-start lg:p-2 ${
                isSel ? 'bg-ink text-white shadow-lg shadow-ink/20' : isToday ? 'bg-brand-soft text-brand' : past ? 'text-stone-300 hover:bg-canvas' : 'text-ink hover:bg-canvas'
              }`}
            >
              <span className="lg:text-left">{cell.day}</span>
              {/* phones: dots */}
              <span className="flex h-1.5 gap-0.5 lg:hidden">
                {cell.items.slice(0, 3).map((b) => (
                  <span key={b.id} className={`h-1.5 w-1.5 rounded-full ${isSel ? 'bg-white' : STATUS[b.status]?.dot}`} />
                ))}
              </span>
              {/* desktop: names */}
              <span className="hidden space-y-1 lg:block">
                {cell.items.slice(0, 2).map((b) => (
                  <span key={b.id} className={`block truncate rounded-lg px-1.5 py-0.5 text-left text-[11px] font-medium ${STATUS[b.status]?.bar}`}>
                    {b.name.split(' ')[0]}
                  </span>
                ))}
                {cell.items.length > 2 && <span className={`block px-1 text-left text-[11px] ${isSel ? 'text-white/70' : 'text-stone-400'}`}>+{cell.items.length - 2} more</span>}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-stone-100 pt-4 text-xs text-stone-500">
        {['new', 'confirmed', 'completed'].map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${STATUS[s].dot}`} aria-hidden="true" />
            {STATUS[s].label}
          </span>
        ))}
      </div>
    </section>
  )
}

function DaySchedule({ day, list, onOpen }) {
  return (
    <div className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-stone-200/70 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Schedule</h2>
        <span className="rounded-full bg-canvas px-3 py-1 text-xs font-semibold text-stone-600">{shortDate(day)}</span>
      </div>
      {list.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl bg-canvas px-4 py-8 text-center">
          <Icon name="calendar" className="h-6 w-6 text-stone-300" />
          <p className="mt-2 text-sm text-stone-500">No cars out on this day.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((b) => (
            <BookingRow key={b.id} booking={b} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  )
}

function BookingRow({ booking: b, onOpen, compact }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-canvas/70 p-2.5 pr-2 transition hover:bg-canvas">
      <button type="button" onClick={() => onOpen(b.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Avatar name={b.name} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-ink">{b.name}</span>
            {!compact && <StatusPill status={b.status} />}
          </span>
          <span className="mt-0.5 block truncate text-xs text-stone-500">
            {rangeText(b)} · {b.passengers} pax · {b.city}
            {b.distanceKm >= 15 ? ` · ${b.distanceKm} km` : ''}
          </span>
          {(b.vehicle || (b.vehicleStatus && b.vehicleStatus !== 'waiting')) && (
            <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${VEHICLE_STATUS[b.vehicleStatus || 'waiting'].pill}`}>
              <Icon name={VEHICLE_STATUS[b.vehicleStatus || 'waiting'].icon} className="h-3 w-3" />
              {b.vehicle ? `${b.vehicle} · ` : ''}
              {VEHICLE_STATUS[b.vehicleStatus || 'waiting'].short}
            </span>
          )}
        </span>
      </button>
      <a href={telHref(b.contact)} aria-label={`Call ${b.name}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-md shadow-brand/25 transition active:scale-95">
        <Icon name="phone" className="h-[18px] w-[18px]" />
      </a>
    </div>
  )
}

/* ---------- Bookings ---------- */

const SORTS = [
  { id: 'start-asc', label: 'Rental date: soonest first' },
  { id: 'start-desc', label: 'Rental date: latest first' },
  { id: 'created-desc', label: 'Request date: newest first' },
  { id: 'created-asc', label: 'Request date: oldest first' },
  { id: 'name-asc', label: 'Customer name: A to Z' },
  { id: 'pax-desc', label: 'Group size: largest first' },
]
const DEFAULT_FILTERS = { statuses: ['new', 'confirmed'], month: 'all', sort: 'start-asc', hidePast: true }

const monthKey = (iso) => iso.slice(0, 7)
const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
}
// A booking belongs to every month its rental days touch.
const touchesMonth = (b, key) => monthKey(b.start) <= key && key <= monthKey(b.end)

const SORTERS = {
  'start-asc': (a, b) => a.start.localeCompare(b.start),
  'start-desc': (a, b) => b.start.localeCompare(a.start),
  'created-desc': (a, b) => b.createdAt.localeCompare(a.createdAt),
  'created-asc': (a, b) => a.createdAt.localeCompare(b.createdAt),
  'name-asc': (a, b) => a.name.localeCompare(b.name),
  'pax-desc': (a, b) => b.passengers - a.passengers,
}

function BookingsPage({ bookings, loading, onOpen }) {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [panelOpen, setPanelOpen] = useState(false)
  const today = todayISO()
  const set = (changes) => setFilters((f) => ({ ...f, ...changes }))

  // Months that have bookings, plus the current month.
  const months = useMemo(() => {
    const keys = new Set([monthKey(today)])
    for (const b of bookings) {
      let [y, m] = monthKey(b.start).split('-').map(Number)
      const last = monthKey(b.end)
      for (let guard = 0; guard < 24; guard++) {
        const key = `${y}-${String(m).padStart(2, '0')}`
        keys.add(key)
        if (key >= last) break
        m += 1
        if (m > 12) {
          m = 1
          y += 1
        }
      }
    }
    return [...keys].sort()
  }, [bookings, today])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return bookings
      .filter((b) => filters.statuses.length === 0 || filters.statuses.includes(b.status))
      .filter((b) => filters.month === 'all' || touchesMonth(b, filters.month))
      .filter((b) => !filters.hidePast || b.end >= today)
      .filter((b) => !q || `${b.name} ${b.contact} ${b.city}`.toLowerCase().includes(q))
      .sort(SORTERS[filters.sort])
  }, [bookings, filters, query, today])

  const activeCount =
    (filters.statuses.length !== DEFAULT_FILTERS.statuses.length || !DEFAULT_FILTERS.statuses.every((s) => filters.statuses.includes(s)) ? 1 : 0) +
    (filters.month !== 'all' ? 1 : 0) +
    (filters.sort !== DEFAULT_FILTERS.sort ? 1 : 0) +
    (filters.hidePast !== DEFAULT_FILTERS.hidePast ? 1 : 0)

  const toggleStatus = (id) =>
    set({ statuses: filters.statuses.includes(id) ? filters.statuses.filter((s) => s !== id) : [...filters.statuses, id] })

  const statusSummary =
    filters.statuses.length === 0 || filters.statuses.length === 4 ? 'All statuses' : filters.statuses.map((s) => STATUS[s].label).join(', ')
  const selectClass =
    'block h-12 w-full appearance-none rounded-2xl border-0 bg-canvas px-4 pr-10 text-base font-medium text-ink outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-brand/40'

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
          <label htmlFor="search" className="sr-only">Search bookings</label>
          <input
            id="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or number"
            className="block h-13 w-full rounded-2xl border-0 bg-white py-3.5 pl-12 pr-4 text-base shadow-sm outline-none ring-1 ring-stone-200/70 focus:ring-2 focus:ring-brand/40"
          />
        </div>
        <button
          type="button"
          onClick={() => setPanelOpen((o) => !o)}
          aria-expanded={panelOpen}
          aria-controls="filter-panel"
          className={`relative flex h-13 shrink-0 items-center gap-2 rounded-2xl px-4 text-sm font-semibold shadow-sm ring-1 transition ${panelOpen ? 'bg-ink text-white ring-ink' : 'bg-white text-ink ring-stone-200/70'}`}
        >
          <Icon name="settings" className="h-5 w-5" />
          <span className="hidden sm:inline">Filters</span>
          {activeCount > 0 && (
            <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${panelOpen ? 'bg-white text-ink' : 'bg-brand text-white'}`}>{activeCount}</span>
          )}
        </button>
      </div>

      {panelOpen && (
        <section id="filter-panel" aria-label="Filters" className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-stone-200/70 animate-[pop-in_.18s_ease-out] sm:p-5">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">Status</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.entries(STATUS).map(([id, st]) => {
                const on = filters.statuses.includes(id)
                const count = bookings.filter((b) => b.status === id).length
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleStatus(id)}
                    className={`flex min-h-12 items-center justify-between gap-2 rounded-2xl px-3 text-sm font-semibold transition ${on ? 'bg-ink text-white' : 'bg-canvas text-stone-600 hover:bg-stone-200'}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${st.dot}`} aria-hidden="true" />
                      {st.label}
                    </span>
                    <span className={`text-xs ${on ? 'text-white/60' : 'text-stone-400'}`}>{count}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="filter-month" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-500">Month</label>
              <div className="relative">
                <select id="filter-month" value={filters.month} onChange={(e) => set({ month: e.target.value })} className={selectClass}>
                  <option value="all">All months</option>
                  {months.map((key) => (
                    <option key={key} value={key}>{monthLabel(key)}</option>
                  ))}
                </select>
                <Icon name="right" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-stone-400" />
              </div>
            </div>
            <div>
              <label htmlFor="filter-sort" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-500">Sort by</label>
              <div className="relative">
                <select id="filter-sort" value={filters.sort} onChange={(e) => set({ sort: e.target.value })} className={selectClass}>
                  {SORTS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
                <Icon name="right" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-stone-400" />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-canvas px-4 py-3">
            <span>
              <span className="block text-sm font-semibold text-ink">Hide past bookings</span>
              <span className="block text-xs text-stone-500">Only show trips that haven’t ended yet</span>
            </span>
            <Toggle label="Hide past bookings" on={filters.hidePast} onChange={(v) => set({ hidePast: v })} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className="h-12 rounded-2xl text-sm font-semibold text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
              Reset
            </button>
            <button type="button" onClick={() => setPanelOpen(false)} className="h-12 rounded-2xl bg-brand text-sm font-semibold text-white hover:bg-brand-dark">
              Show {shown.length} booking{shown.length === 1 ? '' : 's'}
            </button>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-sm text-stone-500">
        <span className="font-semibold text-ink">{shown.length} booking{shown.length === 1 ? '' : 's'}</span>
        <span aria-hidden="true">·</span>
        <span>{statusSummary}</span>
        {filters.month !== 'all' && (
          <>
            <span aria-hidden="true">·</span>
            <span>{monthLabel(filters.month)}</span>
          </>
        )}
        <span aria-hidden="true">·</span>
        <span>{SORTS.find((o) => o.id === filters.sort).label.split(':')[0]}</span>
      </div>

      <section className="rounded-[1.75rem] bg-white p-3 shadow-sm ring-1 ring-stone-200/70 sm:p-4">
        {shown.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-stone-500">{loading ? 'Loading bookings…' : 'No bookings match these filters.'}</p>
            {!loading && activeCount > 0 && (
              <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className="mt-3 text-sm font-semibold text-brand">Reset filters</button>
            )}
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {shown.map((b) => (
              <BookingRow key={b.id} booking={b} onOpen={onOpen} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

/* ---------- Settings ---------- */

function SettingsPage({ adminKey, onLogout }) {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PushSettings adminKey={adminKey} />
      <ShareCard />
      <section className="rounded-[1.75rem] bg-white p-2 shadow-sm ring-1 ring-stone-200/70">
        <button type="button" onClick={onLogout} className="flex h-14 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-semibold text-red-700 hover:bg-red-50">
          <Icon name="logout" className="h-5 w-5" /> Sign out of Alika Admin
        </button>
      </section>
    </div>
  )
}

function Toggle({ on, disabled, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-50 ${on ? 'bg-brand' : 'bg-stone-300'}`}
    >
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-7' : 'left-1'}`} />
    </button>
  )
}

function PushSettings({ adminKey }) {
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
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') setState('blocked')
    } finally {
      setBusy(false)
    }
  }

  const description = {
    checking: 'Checking…',
    install: 'Add Alika Admin to your Home Screen first (Safari › Share › Add to Home Screen), then open it from there.',
    unsupported: 'This browser can’t show notifications. Use Safari on iPhone (iOS 16.4+) or Chrome.',
    off: 'Get an alert on this device the moment a customer books.',
    on: 'This device gets an alert for every new booking.',
    blocked: 'Notifications are blocked. Allow them in iPhone Settings › Notifications › Alika Admin.',
  }[state]

  return (
    <section className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-stone-200/70">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Icon name="bell" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">Booking notifications</p>
          <p className="mt-1 text-sm text-stone-500">{description}</p>
        </div>
        {(state === 'on' || state === 'off') && (
          <Toggle
            label="Booking notifications"
            on={state === 'on'}
            disabled={busy}
            onChange={(next) => (next ? run(() => enablePush(adminKey), () => setState('on')) : run(() => disablePush(adminKey), () => setState('off')))}
          />
        )}
      </div>
      {state === 'on' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => sendTestPush(adminKey), () => setMessage('Test sent, it should arrive in a few seconds.'))}
          className="mt-4 h-12 w-full rounded-2xl bg-canvas text-sm font-semibold text-ink transition hover:bg-stone-200 disabled:opacity-60"
        >
          Send a test notification
        </button>
      )}
      {message && <p className="mt-3 text-sm text-stone-600" role="status">{message}</p>}
    </section>
  )
}

function ShareCard({ compact }) {
  const url = `${window.location.origin}/`
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked */
    }
  }
  const share = () => navigator.share?.({ title: 'Book with Alika Cars', text: 'Book your ride with Alika Cars:', url }).catch(() => {})

  if (compact) {
    return (
      <div className="rounded-3xl bg-white/5 p-4">
        <p className="text-sm font-semibold">Booking page</p>
        <p className="mt-0.5 truncate text-xs text-white/50">{url.replace(/^https?:\/\//, '')}</p>
        <button type="button" onClick={copy} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-ink">
          <Icon name="copy" className="h-4 w-4" /> {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
    )
  }

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] bg-ink p-5 text-white">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand/40 blur-2xl" aria-hidden="true" />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Your booking page</p>
        <p className="mt-1 text-lg font-bold">Share it with customers</p>
        <p className="mt-1 truncate text-sm text-white/60">{url.replace(/^https?:\/\//, '')}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={copy} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-semibold text-ink">
            <Icon name="copy" className="h-4 w-4" /> {copied ? 'Copied!' : 'Copy link'}
          </button>
          {typeof navigator !== 'undefined' && navigator.share ? (
            <button type="button" onClick={share} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand text-sm font-semibold text-white">
              <Icon name="share" className="h-4 w-4" /> Share
            </button>
          ) : (
            <a href={url} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand text-sm font-semibold text-white">
              Open page
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

/* ---------- Sign in ---------- */

function Login({ onLogin, error }) {
  const [value, setValue] = useState('')
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-5">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (value.trim()) onLogin(value.trim())
        }}
        className="w-full max-w-sm rounded-[2rem] bg-white p-7 text-center shadow-xl shadow-stone-300/40 ring-1 ring-stone-200/70"
      >
        <img src="/alika-logo.png" alt="Alika Cars" className="mx-auto h-24 w-24 rounded-3xl object-cover shadow-lg shadow-brand/30" />
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">Alika Admin</h1>
        <p className="mt-1 text-sm text-stone-500">Sign in to manage your bookings.</p>
        <label htmlFor="admin-password" className="sr-only">Admin password</label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Password"
          className="mt-6 block w-full rounded-2xl border-0 bg-canvas px-4 py-3.5 text-base outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-brand/40"
        />
        {error && <p className="mt-2 text-sm font-medium text-brand" role="alert">{error}</p>}
        <button type="submit" className="mt-4 h-13 w-full rounded-2xl bg-ink py-3.5 font-semibold text-white transition hover:bg-black active:scale-[0.99]">
          Sign in
        </button>
      </form>
    </div>
  )
}
