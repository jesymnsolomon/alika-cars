import { useRef, useState } from 'react'
import RangeCalendar, { countDays, toISODate } from './components/RangeCalendar.jsx'
import { BUSINESS, WEB3FORMS_KEY } from './config.js'

const PURPOSES = ['Baguio tour', 'Family trip', 'Out-of-town travel', 'Airport / terminal pickup', 'Business', 'Event or wedding', 'Other']

const EMPTY = { fullName: '', city: '', contact: '', passengers: 1, purposes: [], details: '', botcheck: '' }

// Posts JSON and reports success, giving up after 10 seconds so nobody waits forever.
async function postWithTimeout(url, data, ms = 10000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    })
    const json = await res.json().catch(() => ({}))
    const ok = res.ok && (json.success === true || json.ok === true)
    return { ok, error: ok ? '' : `${res.status}: ${json.message || json.error || 'no details'}` }
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? 'timed out' : err.message }
  } finally {
    clearTimeout(timer)
  }
}

const formatDate = (d) =>
  d ? d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : ''

function buildMessage({ start, end, form }) {
  const days = countDays(start, end)
  return [
    'NEW BOOKING REQUEST - Alika Cars',
    '',
    `Dates: ${formatDate(start)} to ${formatDate(end)} (${days} day${days > 1 ? 's' : ''})`,
    `Name: ${form.fullName.trim()}`,
    `City: ${form.city.trim()}`,
    `Contact: ${form.contact.trim()}`,
    `Passengers: ${form.passengers}`,
    `Purpose: ${form.purposes.join(', ')}`,
    `Travel details: ${form.details.trim()}`,
  ].join('\n')
}

function smsLink(body) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  return `sms:${BUSINESS.phone}${isIOS ? '&' : '?'}body=${encodeURIComponent(body)}`
}

function Field({ label, htmlFor, error, hint, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-brand-ink">
        {label} <span className="text-brand" aria-hidden="true">*</span>
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
      {error && <p className="mt-1 text-sm font-medium text-brand" role="alert">{error}</p>}
    </div>
  )
}

const inputClass = (hasError) =>
  `block w-full rounded-xl border bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15 ${
    hasError ? 'border-brand' : 'border-stone-300'
  }`

function Card({ step, title, children, id, required }) {
  return (
    <section id={id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-200 sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">{step}</span>
        <h2 className="text-lg font-semibold text-brand-ink sm:text-xl">{title}{required && <span className="text-brand" aria-hidden="true"> *</span>}</h2>
      </div>
      {children}
    </section>
  )
}

export default function App() {
  const [start, setStart] = useState(null)
  const [end, setEnd] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | done
  const [emailSent, setEmailSent] = useState(false)
  const [saved, setSaved] = useState(false)
  const [problems, setProblems] = useState([])
  const [message, setMessage] = useState('')
  const topRef = useRef(null)

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const togglePurpose = (p) =>
    update('purposes', form.purposes.includes(p) ? form.purposes.filter((x) => x !== p) : [...form.purposes, p])

  const onDates = (s, e) => {
    setStart(s)
    setEnd(e)
    if (errors.dates) setErrors((x) => ({ ...x, dates: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!start || !end) e.dates = start ? 'Now tap your return date.' : 'Please pick your start and end dates.'
    if (form.fullName.trim().length < 2) e.fullName = 'Please enter your full name.'
    if (!form.city.trim()) e.city = 'Please enter your city.'
    const digits = form.contact.replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 13) e.contact = 'Please enter a valid mobile number, like 0917 123 4567.'
    if (!form.passengers || form.passengers < 1) e.passengers = 'At least 1 passenger.'
    if (!form.purposes.length) e.purposes = 'Please pick at least one purpose.'
    if (form.details.trim().length < 3) e.details = 'Tell us a little about your trip.'
    return e
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    const first = Object.keys(found)[0]
    if (first) {
      const target = document.getElementById(first)
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      if (first !== 'dates' && first !== 'purposes') target?.focus({ preventScroll: true })
      return
    }

    const body = buildMessage({ start, end, form })
    setMessage(body)
    setStatus('sending')

    const fields = {
      name: form.fullName.trim(),
      city: form.city.trim(),
      contact: form.contact.trim(),
      start: formatDate(start),
      end: formatDate(end),
      days: countDays(start, end),
      passengers: form.passengers,
      purpose: form.purposes.join(', '),
      details: form.details.trim(),
      botcheck: form.botcheck,
    }

    // The booking is saved for the admin dashboard and emailed at the same time.
    if (!WEB3FORMS_KEY) console.error('VITE_WEB3FORMS_KEY is missing from this build. Add it in Vercel and redeploy.')
    const [email, stored] = await Promise.all([
      postWithTimeout('https://api.web3forms.com/submit', {
        access_key: WEB3FORMS_KEY,
        subject: `New booking: ${fields.name} (${fields.start} to ${fields.end})`,
        from_name: 'Alika Booking Page',
        botcheck: fields.botcheck,
        Name: fields.name,
        City: fields.city,
        Contact: fields.contact,
        'Start date': fields.start,
        'End date': fields.end,
        Days: fields.days,
        Passengers: fields.passengers,
        Purpose: fields.purpose,
        'Travel details': fields.details,
      }),
      postWithTimeout('/api/bookings', {
        ...fields,
        purposes: form.purposes,
        startISO: toISODate(start),
        endISO: toISODate(end),
      }),
    ])

    if (!email.ok) console.error('Email (Web3Forms) failed:', email.error)
    if (!stored.ok) console.error('Saving the booking failed:', stored.error)
    setProblems([!email.ok && `Email: ${WEB3FORMS_KEY ? email.error : 'Web3Forms key missing'}`, !stored.ok && `Save: ${stored.error}`].filter(Boolean))
    setSaved(stored.ok)
    setEmailSent(email.ok)
    setStatus('done')
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const reset = () => {
    setStart(null)
    setEnd(null)
    setForm(EMPTY)
    setErrors({})
    setStatus('idle')
    setMessage('')
  }

  const days = countDays(start, end)

  return (
    <div ref={topRef} className="min-h-dvh">
      <header className="px-5 pb-8 pt-6 text-center text-white sm:pb-10 sm:pt-8" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
        <img src="/alika-logo.png" alt="Alika Car Rentals and Baguio Tours" className="mx-auto h-52 w-52 object-cover sm:h-64 sm:w-64" />
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Book your ride</h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-white/85 sm:text-base">Lika, sakay na! Pick your dates, tell us about your trip, and we will get back to you.</p>
        <p className="mt-2 text-xs text-white/70">All fields marked * are required</p>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        {status === 'done' ? (
          <SuccessScreen emailSent={emailSent} saved={saved} problems={problems} message={message} onReset={reset} />
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Hidden from people; bots that fill it are ignored. */}
            <input type="text" name="botcheck" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.botcheck} onChange={(e) => update('botcheck', e.target.value)} className="hidden" />
            <div className="grid gap-5 lg:grid-cols-2">
              <Card step="1" title="When do you need the car?" id="dates" required>
                <RangeCalendar start={start} end={end} onChange={onDates} />

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className={`rounded-2xl border p-3 ${start ? 'border-brand bg-brand-soft' : 'border-stone-200'}`}>
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Start</p>
                    <p className="mt-0.5 text-sm font-semibold text-brand-ink">{start ? formatDate(start) : 'Tap a date'}</p>
                  </div>
                  <div className={`rounded-2xl border p-3 ${end ? 'border-brand bg-brand-soft' : 'border-stone-200'}`}>
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-500">End</p>
                    <p className="mt-0.5 text-sm font-semibold text-brand-ink">{end ? formatDate(end) : start ? 'Tap return date' : 'Tap a date'}</p>
                  </div>
                </div>
                {days > 0 && (
                  <p className="mt-3 text-center text-sm font-medium text-brand">{days} day{days > 1 ? 's' : ''} rental</p>
                )}
                {errors.dates && <p className="mt-3 text-center text-sm font-medium text-brand" role="alert">{errors.dates}</p>}
              </Card>

              <Card step="2" title="Your details">
                <div className="space-y-4">
                  <Field label="Full name" htmlFor="fullName" error={errors.fullName}>
                    <input id="fullName" required type="text" autoComplete="name" placeholder="Juan Dela Cruz" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} className={inputClass(errors.fullName)} />
                  </Field>
                  <Field label="City" htmlFor="city" error={errors.city} hint="Where you are coming from">
                    <input id="city" required type="text" autoComplete="address-level2" placeholder="e.g. Quezon City" value={form.city} onChange={(e) => update('city', e.target.value)} className={inputClass(errors.city)} />
                  </Field>
                  <Field label="Contact number" htmlFor="contact" error={errors.contact}>
                    <input id="contact" required type="tel" inputMode="tel" autoComplete="tel" placeholder="0917 123 4567" value={form.contact} onChange={(e) => update('contact', e.target.value)} className={inputClass(errors.contact)} />
                  </Field>
                  <Field label="How many people will ride?" htmlFor="passengers" error={errors.passengers}>
                    <div className="flex items-center gap-3">
                      <button type="button" aria-label="Fewer passengers" onClick={() => update('passengers', Math.max(1, form.passengers - 1))} className="flex h-12 w-12 items-center justify-center rounded-xl border border-stone-300 text-2xl font-medium text-brand-ink transition hover:bg-brand-soft disabled:opacity-30" disabled={form.passengers <= 1}>−</button>
                      <input id="passengers" required type="number" inputMode="numeric" min="1" max="30" value={form.passengers} onChange={(e) => update('passengers', Math.max(0, Math.min(30, parseInt(e.target.value, 10) || 0)))} className={`${inputClass(errors.passengers)} w-20 text-center font-semibold`} />
                      <button type="button" aria-label="More passengers" onClick={() => update('passengers', Math.min(30, form.passengers + 1))} className="flex h-12 w-12 items-center justify-center rounded-xl border border-stone-300 text-2xl font-medium text-brand-ink transition hover:bg-brand-soft">+</button>
                      <span className="text-sm text-stone-500">{form.passengers === 1 ? 'person' : 'people'}</span>
                    </div>
                  </Field>
                </div>
              </Card>
            </div>

            <Card step="3" title="Tell us about your trip">
              <p className="mb-3 text-sm font-medium text-brand-ink">What will you use the car for? <span className="text-brand" aria-hidden="true">*</span> <span className="font-normal text-stone-500">(tap all that apply)</span></p>
              <div id="purposes" className={`flex flex-wrap gap-2 ${errors.purposes ? '' : 'mb-5'}`}>
                {PURPOSES.map((p) => {
                  const on = form.purposes.includes(p)
                  return (
                    <button key={p} type="button" aria-pressed={on} onClick={() => togglePurpose(p)} className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition ${on ? 'border-brand bg-brand text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-brand hover:text-brand'}`}>
                      {p}
                    </button>
                  )
                })}
              </div>
              {errors.purposes && <p className="mb-5 mt-2 text-sm font-medium text-brand" role="alert">{errors.purposes}</p>}
              <Field label="Travel details" htmlFor="details" error={errors.details} hint="Where you will go, pickup place and time, self-drive or with driver, and anything else we should know.">
                <textarea id="details" required rows="4" placeholder="e.g. Pickup at Victory Liner terminal at 9 AM, going around Baguio and La Trinidad, need a driver." value={form.details} onChange={(e) => update('details', e.target.value)} className={`${inputClass(errors.details)} resize-y`} />
              </Field>
            </Card>

            <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-brand via-brand to-brand/0 px-4 pb-4 pt-6 sm:static sm:mx-0 sm:bg-none sm:p-0">
              <button type="submit" disabled={status === 'sending'} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white text-lg font-semibold text-brand shadow-lg shadow-black/20 transition hover:bg-brand-soft active:scale-[0.99] disabled:opacity-70">
                {status === 'sending' ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" aria-hidden="true" />
                    Sending...
                  </>
                ) : (
                  'Send booking request'
                )}
              </button>
            </div>
          </form>
        )}

        <footer className="mt-10 text-center text-sm text-white/80">
          <p>Questions? Call or text <a href={`tel:${BUSINESS.phone}`} className="font-semibold text-white underline underline-offset-2">{BUSINESS.phoneDisplay}</a></p>
          <p className="mt-1">© {new Date().getFullYear()} {BUSINESS.name}</p>
        </footer>
      </main>
    </div>
  )
}

function SuccessScreen({ emailSent, saved, problems, message, onReset }) {
  const whatsapp = `https://wa.me/${BUSINESS.phone.replace('+', '')}?text=${encodeURIComponent(message)}`
  const delivered = emailSent || saved
  return (
    <div className="mx-auto max-w-lg rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-stone-200 sm:p-8">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand">
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
      </div>
      <h2 className="mt-4 text-2xl font-bold text-brand-ink">{delivered ? 'Booking request sent!' : 'One last step'}</h2>
      <p className="mt-2 text-stone-600">
        {delivered
          ? `Salamat! We received your request and will contact you at the number you gave us soon.`
          : 'We could not send your request right now. Please send it to us with one tap below.'}
      </p>

      {!delivered && (
      <div className="mt-6 space-y-3">
        <a href={smsLink(message)} className="flex h-14 w-full items-center justify-center rounded-2xl bg-brand text-lg font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark">
          Send via text message
        </a>
        <a href={whatsapp} target="_blank" rel="noreferrer" className="flex h-14 w-full items-center justify-center rounded-2xl border-2 border-brand text-lg font-semibold text-brand transition hover:bg-brand-soft">
          Send via WhatsApp
        </a>
      </div>
      )}

      <details className="mt-6 text-left">
        <summary className="cursor-pointer text-sm font-medium text-stone-600">See your booking details</summary>
        <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-stone-50 p-4 font-sans text-sm text-stone-700">{message}</pre>
      </details>

      {problems.length > 0 && (
        <p className="mt-4 text-left text-xs text-stone-400">Technical details: {problems.join(' · ')}</p>
      )}

      <button type="button" onClick={onReset} className="mt-6 min-h-11 text-sm font-medium text-brand underline-offset-2 hover:underline">
        Make another booking
      </button>
    </div>
  )
}
