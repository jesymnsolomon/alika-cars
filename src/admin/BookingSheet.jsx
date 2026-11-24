import { useEffect, useState } from 'react'
import { dayCount, shortDate, timeAgo } from './dates.js'
import { Avatar, Icon, STATUS, StatusPill, VEHICLE_STATUS, smsHref, telHref } from './ui.jsx'
import { BUSINESS } from '../config.js'

// Full booking details: a sheet that slides up on phones, a centered card on desktop.
export default function BookingSheet({ booking: b, onClose, onUpdate, onDelete }) {
  const [notes, setNotes] = useState(b.notes || '')
  const [vehicle, setVehicle] = useState(b.vehicle || '')
  const days = dayCount(b.start, b.end)

  useEffect(() => setNotes(b.notes || ''), [b.id, b.notes])
  useEffect(() => setVehicle(b.vehicle || ''), [b.id, b.vehicle])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const saveNotes = () => notes !== (b.notes || '') && onUpdate(b.id, { notes })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/50 backdrop-blur-[2px] animate-[fade-in_.2s_ease-out]" />
      <div className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl animate-[sheet-up_.32s_cubic-bezier(.2,.9,.3,1)] sm:max-w-lg sm:rounded-[2rem] sm:animate-[pop-in_.22s_ease-out]">
        <div className="sticky top-0 z-10 bg-white/95 px-5 pb-3 pt-3 backdrop-blur sm:px-6 sm:pt-5">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-stone-200 sm:hidden" aria-hidden="true" />
          <div className="flex items-center gap-3">
            <Avatar name={b.name} size="h-12 w-12 text-base" />
            <div className="min-w-0 flex-1">
              <h2 id="sheet-title" className="truncate text-lg font-semibold text-ink">{b.name}</h2>
              <p className="text-sm text-stone-500">Requested {timeAgo(b.createdAt)}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close details" className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200">
              <Icon name="x" />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-5 sm:px-6">
          <div className="grid grid-cols-2 gap-2">
            <a href={telHref(b.contact)} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-brand text-base font-semibold text-white shadow-lg shadow-brand/25 transition active:scale-[0.98]">
              <Icon name="phone" /> Call
            </a>
            <a href={smsHref(b.contact)} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-ink text-base font-semibold text-white transition active:scale-[0.98]">
              <Icon name="message" /> Text
            </a>
          </div>
          <p className="-mt-3 text-center text-sm font-medium text-stone-500">{b.contact}</p>

          <div className="rounded-3xl bg-canvas p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Rental dates</p>
                <p className="mt-1 text-base font-semibold text-ink">
                  {shortDate(b.start)}
                  {b.end !== b.start && <span className="text-stone-400"> → </span>}
                  {b.end !== b.start && shortDate(b.end)}
                </p>
              </div>
              <span className="rounded-2xl bg-white px-3 py-2 text-center text-sm font-semibold text-ink shadow-sm">
                {days}
                <span className="block text-[10px] font-medium uppercase text-stone-500">day{days > 1 ? 's' : ''}</span>
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <p className="flex items-center gap-2 text-stone-700"><Icon name="users" className="h-4 w-4 text-stone-400" /> {b.passengers} {b.passengers === 1 ? 'person' : 'people'}</p>
              <p className="flex items-center gap-2 text-stone-700"><Icon name="pin" className="h-4 w-4 text-stone-400" /> {b.city}</p>
            </div>
            {b.distanceKm > 0 && (
              <p className="mt-3 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-medium text-ink shadow-sm">
                <Icon name="clock" className="h-4 w-4 text-brand" />
                {b.distanceKm < 15 ? 'Within Baguio area' : `≈ ${b.distanceKm} km from Baguio · about ${b.driveHours} hr${b.driveHours === 1 ? '' : 's'} drive`}
              </p>
            )}
          </div>

          {(b.purposes?.length > 0 || b.details) && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-stone-500">Trip</p>
              {b.purposes?.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {b.purposes.map((p) => (
                    <span key={p} className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">{p}</span>
                  ))}
                </div>
              )}
              {b.details && <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{b.details}</p>}
            </div>
          )}

          <div>
            <p className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-stone-500">
              Status <StatusPill status={b.status} />
            </p>
            <div className="grid grid-cols-4 gap-1 rounded-2xl bg-canvas p-1" role="radiogroup" aria-label="Booking status">
              {Object.entries(STATUS).map(([id, s]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={b.status === id}
                  onClick={() => onUpdate(b.id, { status: id })}
                  className={`min-h-11 rounded-xl px-1 text-xs font-semibold transition sm:text-sm ${b.status === id ? 'bg-white text-ink shadow-sm' : 'text-stone-500'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="sheet-vehicle" className="mb-2 block text-xs font-medium uppercase tracking-wider text-stone-500">Vehicle</label>
            <div className="mb-2 flex flex-wrap gap-2">
              {BUSINESS.fleet.map((car) => (
                <button
                  key={car}
                  type="button"
                  aria-pressed={vehicle === car}
                  onClick={() => {
                    const next = vehicle === car ? '' : car
                    setVehicle(next)
                    onUpdate(b.id, { vehicle: next })
                  }}
                  className={`min-h-11 rounded-2xl px-4 text-sm font-semibold transition ${vehicle === car ? 'bg-ink text-white' : 'bg-canvas text-stone-600 hover:bg-stone-200'}`}
                >
                  {car}
                </button>
              ))}
            </div>
            <input
              id="sheet-vehicle"
              type="text"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              onBlur={() => vehicle.trim() !== (b.vehicle || '') && onUpdate(b.id, { vehicle: vehicle.trim() })}
              placeholder="Or type another vehicle"
              className="block h-12 w-full rounded-2xl border-0 bg-canvas px-4 text-base outline-none ring-1 ring-transparent focus:bg-white focus:ring-brand/40"
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-stone-500">Vehicle status</p>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Vehicle status">
              {Object.entries(VEHICLE_STATUS).map(([id, v]) => {
                const on = (b.vehicleStatus || 'waiting') === id
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => onUpdate(b.id, { vehicleStatus: id })}
                    className={`flex min-h-12 items-center gap-2 rounded-2xl px-3 text-left text-sm font-semibold transition ${on ? 'bg-ink text-white' : 'bg-canvas text-stone-600 hover:bg-stone-200'}`}
                  >
                    <Icon name={v.icon} className={`h-4 w-4 shrink-0 ${on ? 'text-white' : 'text-stone-400'}`} />
                    {v.label}
                  </button>
                )
              })}
            </div>
            {b.vehicleStatus === 'unwashed' && (
              <p className="mt-2 rounded-2xl bg-orange-50 px-3 py-2 text-sm text-orange-800">Once it’s washed, tap <strong>Returned</strong> to clear the reminder.</p>
            )}
          </div>

          <div>
            <label htmlFor="sheet-notes" className="mb-2 block text-xs font-medium uppercase tracking-wider text-stone-500">Private notes</label>
            <textarea
              id="sheet-notes"
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="e.g. Downpayment received · Car: Vios · Pickup at Victory Liner"
              className="block w-full resize-y rounded-2xl border-0 bg-canvas px-4 py-3 text-base outline-none ring-1 ring-transparent focus:bg-white focus:ring-brand/40"
            />
          </div>

          <button type="button" onClick={() => onDelete(b)} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-red-700 transition hover:bg-red-50">
            <Icon name="trash" className="h-4 w-4" /> Delete booking
          </button>
        </div>
      </div>
    </div>
  )
}
