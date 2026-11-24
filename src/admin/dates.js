export const parseISO = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const toISO = (d) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const todayISO = () => toISO(new Date())

export const shortDate = (iso) =>
  parseISO(iso).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })

export const dayCount = (start, end) => Math.round((parseISO(end) - parseISO(start)) / 86400000) + 1

export const timeAgo = (isoDateTime) => {
  const mins = Math.round((Date.now() - new Date(isoDateTime)) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  return new Date(isoDateTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const monthDay = (iso) => parseISO(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })

export const rangeText = (b) => (b.start === b.end ? shortDate(b.start) : `${monthDay(b.start)} – ${monthDay(b.end)}`)

export const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}
