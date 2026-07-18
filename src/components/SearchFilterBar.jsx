import { Search } from 'lucide-react'
import { inputClass } from './Field'

const CATEGORIES = ['All', 'Electronics', 'Furniture']
const STATUSES = [
  { value: 'all', label: 'All stock' },
  { value: 'ok', label: 'In stock' },
  { value: 'low', label: 'Low' },
  { value: 'out', label: 'Out' },
]

export default function SearchFilterBar({ query, onQuery, category, onCategory, status, onStatus }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search products…"
          className={`${inputClass} pl-10`}
        />
      </div>

      <div className="flex gap-2">
        <select
          value={category}
          onChange={(e) => onCategory(e.target.value)}
          className={`${inputClass} sm:w-40`}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === 'All' ? 'All types' : c}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => onStatus(e.target.value)}
          className={`${inputClass} sm:w-36`}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
