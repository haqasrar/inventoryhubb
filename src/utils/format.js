const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function formatINR(amount) {
  return inr.format(Number(amount) || 0)
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function isToday(iso) {
  const d = new Date(iso)
  const now = new Date()
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  )
}

/** Time only — history rows already sit under a date heading. */
export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

/** Groups history rows: 'Today', 'Yesterday', or the date itself. */
export function dayLabel(iso) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const sameDay = (a, b) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()

  if (sameDay(d, today)) return 'Today'
  if (sameDay(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

/** Sortable YYYY-MM-DD key in local time, so grouping matches what dayLabel shows. */
export function dayKey(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 'out' | 'low' | 'ok' — the single source of truth for stock status everywhere. */
export function stockStatus(product) {
  if (product.quantity <= 0) return 'out'
  if (product.quantity <= product.lowStockThreshold) return 'low'
  return 'ok'
}
