import { useMemo, useState } from 'react'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function sameDay(a, b) {
  return a && b && a.getTime() === b.getTime()
}

export function countDays(start, end) {
  if (!start || !end) return 0
  return Math.round((end - start) / 86400000) + 1
}

function ChevronIcon({ direction }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {direction === 'left' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  )
}

/**
 * Tap once to pick the start date, tap again to pick the end date.
 * Tapping the same day twice books a single day.
 */
export default function RangeCalendar({ start, end, onChange }) {
  const today = startOfDay(new Date())
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const cells = useMemo(() => {
    const year = view.getFullYear()
    const month = view.getMonth()
    const offset = new Date(year, month, 1).getDay()
    const total = new Date(year, month + 1, 0).getDate()
    const list = Array.from({ length: offset }, () => null)
    for (let day = 1; day <= total; day++) list.push(new Date(year, month, day))
    return list
  }, [view])

  const canGoBack =
    view.getFullYear() > today.getFullYear() ||
    (view.getFullYear() === today.getFullYear() && view.getMonth() > today.getMonth())

  const changeMonth = (step) =>
    setView((v) => new Date(v.getFullYear(), v.getMonth() + step, 1))

  const pick = (date) => {
    if (!start || end || date < start) onChange(date, null)
    else onChange(start, date)
  }

  const monthLabel = view.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })

  return (
    <div className="select-none">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="flex h-11 w-11 items-center justify-center rounded-full text-brand-ink transition hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-transparent"
        >
          <ChevronIcon direction="left" />
        </button>
        <p className="text-base font-semibold text-brand-ink" aria-live="polite">{monthLabel}</p>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          aria-label="Next month"
          className="flex h-11 w-11 items-center justify-center rounded-full text-brand-ink transition hover:bg-brand-soft"
        >
          <ChevronIcon direction="right" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-medium text-stone-500">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />
          const past = date < today
          const isStart = sameDay(date, start)
          const isEnd = sameDay(date, end)
          const inRange = start && end && date > start && date < end
          const isToday = sameDay(date, today)
          const edge = isStart || isEnd

          // Light band behind the range so it reads as one stretch of days.
          let band = ''
          if (start && end && !sameDay(start, end)) {
            if (inRange) band = 'bg-brand-soft'
            else if (isStart) band = 'bg-gradient-to-r from-transparent from-50% to-brand-soft to-50%'
            else if (isEnd) band = 'bg-gradient-to-r from-brand-soft from-50% to-transparent to-50%'
          }

          return (
            <div key={date.toISOString()} className={`flex justify-center ${band}`}>
              <button
                type="button"
                disabled={past}
                onClick={() => pick(date)}
                aria-pressed={edge || inRange ? 'true' : 'false'}
                aria-label={date.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
                className={[
                  'flex h-11 w-11 items-center justify-center rounded-full text-sm transition sm:h-12 sm:w-12 sm:text-base',
                  past && 'cursor-not-allowed text-stone-300',
                  !past && !edge && 'text-stone-800 hover:bg-brand-soft',
                  edge && 'bg-brand font-semibold text-white shadow-md shadow-brand/30',
                  isToday && !edge && 'font-semibold text-brand ring-1 ring-brand/40',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {date.getDate()}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
