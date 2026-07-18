import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  HistoryIcon,
  SearchX,
  Layers,
  Search,
  X,
  Receipt,
} from 'lucide-react'
import { useInventory } from '../context/useInventory'
import { formatINR, formatTime, dayLabel, dayKey } from '../utils/format'
import { PAYMENT_OPTIONS, paymentOf, paymentLabel, paymentStyle } from '../utils/payment'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import Bill from '../components/Bill'
import { inputClass } from '../components/Field'

/**
 * Categories are shown as chips rather than a dropdown so every way of slicing the
 * history is visible at a glance. The payment ones are sale-only by definition.
 */
const CATEGORIES = [
  { value: 'all', label: 'Everything', icon: Layers },
  { value: 'sale', label: 'Sold', icon: ArrowDownRight },
  { value: 'restock', label: 'Restocked', icon: ArrowUpRight },
  ...PAYMENT_OPTIONS.map((o) => ({ value: `pay:${o.value}`, label: o.label, icon: o.icon })),
]

/** Quick date ranges, so the common questions do not need two date pickers. */
const RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom dates' },
  // Capped at the newest 500 entries by the service — see getTransactions.
  { value: 'all', label: 'All time' },
]

function startOfDaysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export default function History() {
  const { getBill, getTransactions } = useInventory()

  const [bill, setBill] = useState(null)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [range, setRange] = useState('30')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  /**
   * The date range is fetched from the server; category, payment and text filtering
   * then run on that window. Firestore cannot do substring search, and pulling the
   * whole history on every visit would be slow and needlessly expensive.
   */
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    const opts =
      range === 'today'
        ? { from: startOfDaysAgo(0) }
        : range === '7'
          ? { from: startOfDaysAgo(6) }
          : range === '30'
            ? { from: startOfDaysAgo(29) }
            : range === 'custom'
              ? { from: from || undefined, to: to || undefined }
              : {}

    getTransactions(opts)
      .then((next) => {
        if (!cancelled) setRows(next)
      })
      .catch((err) => {
        console.error(err)
        if (!cancelled) setError('Could not load history. Check your internet connection.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [getTransactions, range, from, to])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    return rows.filter((t) => {
      // Searches the note as well as the product, since the note is where the
      // customer or trader name is written.
      if (q && !`${t.productName} ${t.note ?? ''}`.toLowerCase().includes(q)) return false

      if (type.startsWith('pay:')) {
        if (t.type !== 'sale' || paymentOf(t) !== type.slice(4)) return false
      } else if (type !== 'all' && t.type !== type) {
        return false
      }
      return true
    })
  }, [rows, query, type])

  /** Rows grouped under a date heading, newest day first. */
  const days = useMemo(() => {
    const groups = new Map()
    for (const t of filtered) {
      const key = dayKey(t.createdAt)
      if (!groups.has(key)) {
        groups.set(key, { key, label: dayLabel(t.createdAt), items: [], sold: 0, bought: 0 })
      }
      const group = groups.get(key)
      group.items.push(t)
      if (t.type === 'sale') group.sold += t.total
      else group.bought += t.total
    }
    return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key))
  }, [filtered])

  const totals = useMemo(() => {
    const sales = filtered.filter((t) => t.type === 'sale')
    const sold = sales.reduce((s, t) => s + t.total, 0)
    const bought = filtered.filter((t) => t.type === 'restock').reduce((s, t) => s + t.total, 0)
    const credit = sales
      .filter((t) => paymentOf(t) === 'credit')
      .reduce((s, t) => s + t.total, 0)
    return { sold, bought, credit }
  }, [filtered])

  return (
    <>
      <PageHeader title="History" subtitle="Every sale and every delivery, newest first." />

      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customer, trader or product…"
            aria-label="Search history"
            className={`${inputClass} pl-10 ${query ? 'pr-10' : ''}`}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={type === value}
              onClick={() => setType(value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                type === value
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            aria-label="Date range"
            className={`${inputClass} sm:w-44`}
          >
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          {range === 'custom' && (
            <div className="flex flex-1 items-center gap-2">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-label="From date"
                className={inputClass}
              />
              <span className="text-sm text-slate-400">to</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                aria-label="To date"
                className={inputClass}
              />
            </div>
          )}
        </div>
      </div>

      {query.trim() && (
        <p className="mb-3 text-sm text-slate-600">
          {filtered.length === 0 ? (
            <>
              Nothing found for <span className="font-semibold">“{query.trim()}”</span>
            </>
          ) : (
            <>
              <span className="font-semibold">{filtered.length}</span> entr
              {filtered.length === 1 ? 'y' : 'ies'} matching{' '}
              <span className="font-semibold">“{query.trim()}”</span>
            </>
          )}
        </p>
      )}

      {filtered.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-slate-500">
              {query.trim() ? 'Sold in these results' : 'Sold in this period'}
            </p>
            <p className="tabular mt-1 text-xl font-semibold text-indigo-600">
              {formatINR(totals.sold)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-slate-500">Of that, on credit</p>
            <p className="tabular mt-1 text-xl font-semibold text-amber-600">
              {formatINR(totals.credit)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-slate-500">Spent on stock</p>
            <p className="tabular mt-1 text-xl font-semibold text-emerald-600">
              {formatINR(totals.bought)}
            </p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <p className="px-5 py-14 text-center text-sm text-slate-500">Loading history…</p>
        ) : error ? (
          <p className="px-5 py-14 text-center text-sm text-red-600">{error}</p>
        ) : rows.length === 0 && !query.trim() ? (
          <EmptyState
            icon={HistoryIcon}
            title="No activity in this period"
            description="Once you record a sale or add new stock, it will appear here."
            actionLabel="Record a sale"
            actionTo="/sell"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={query.trim() ? `No match for “${query.trim()}”` : 'Nothing in this range'}
            description={
              query.trim()
                ? 'Check the spelling, or widen the category and date filters — the name may be outside the range you picked.'
                : 'Try widening the dates or changing the filter.'
            }
          />
        ) : (
          days.map((day) => (
            <section key={day.key}>
              <div className="flex items-center justify-between gap-3 border-y border-slate-200 bg-slate-50 px-4 py-2.5 sm:px-5">
                <h3 className="text-sm font-semibold text-slate-700">{day.label}</h3>
                <p className="tabular text-xs text-slate-500">
                  {day.sold > 0 && <span>sold {formatINR(day.sold)}</span>}
                  {day.sold > 0 && day.bought > 0 && <span> · </span>}
                  {day.bought > 0 && <span>stock {formatINR(day.bought)}</span>}
                </p>
              </div>

              <ul className="divide-y divide-slate-100">
                {day.items.map((t) => {
                  const sale = t.type === 'sale'
                  const Icon = sale ? ArrowDownRight : ArrowUpRight
                  return (
                    <li key={t.id} className="flex items-start gap-3 px-4 py-4 sm:px-5">
                      <span
                        className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ${
                          sale ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        <Icon size={18} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium leading-snug">{t.productName}</p>
                          {sale && t.paymentMethod && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${paymentStyle(t.paymentMethod)}`}
                            >
                              {paymentLabel(t.paymentMethod)}
                            </span>
                          )}
                          {!sale && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                              Restocked
                            </span>
                          )}
                        </div>
                        <p className="tabular mt-0.5 text-sm text-slate-500">
                          {sale ? 'Sold' : 'Added'} {t.quantity} × {formatINR(t.unitPrice)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatTime(t.createdAt)}
                          {t.note && <span className="text-slate-500"> · {t.note}</span>}
                        </p>
                        {t.billNumber && (
                          <button
                            type="button"
                            onClick={async () => setBill(await getBill(t.billNumber))}
                            className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 transition hover:underline"
                          >
                            <Receipt size={13} />
                            Bill {t.billNumber}
                          </button>
                        )}
                      </div>

                      <span
                        className={`tabular shrink-0 font-semibold ${
                          sale ? 'text-slate-900' : 'text-emerald-700'
                        }`}
                      >
                        {sale ? '+' : '−'}
                        {formatINR(t.total)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      {bill && <Bill bill={bill} onClose={() => setBill(null)} />}
    </>
  )
}
