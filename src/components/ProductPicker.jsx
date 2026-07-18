import { useMemo, useState } from 'react'
import { Search, Check } from 'lucide-react'
import { inputClass } from './Field'
import StockBadge from './StockBadge'
import { formatINR } from '../utils/format'

/**
 * Searchable list of products. `disableOutOfStock` is used on the Sell page — you cannot
 * sell what you do not have, so those rows are visibly unavailable rather than hidden.
 *
 * Pass `selectedId` for a single choice (Restock) or `selectedIds` for many (the Sell cart).
 */
export default function ProductPicker({
  products,
  selectedId,
  selectedIds,
  onSelect,
  disableOutOfStock,
}) {
  const [query, setQuery] = useState('')
  const isSelected = (id) => (selectedIds ? selectedIds.includes(id) : id === selectedId)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products
  }, [products, query])

  return (
    <div>
      <div className="relative mb-2">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products…"
          className={`${inputClass} pl-10`}
        />
      </div>

      <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
        {filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-500">No products match.</p>
        )}

        {filtered.map((p) => {
          const disabled = disableOutOfStock && p.quantity <= 0
          const selected = isSelected(p.id)

          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`${p.name}, ${p.quantity} in stock, ${formatINR(p.sellPrice)}`}
              onClick={() => onSelect(p.id)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                selected ? 'bg-indigo-50' : disabled ? 'opacity-50' : 'hover:bg-slate-50'
              } ${disabled ? 'cursor-not-allowed' : ''}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{p.name}</span>
                <span className="tabular mt-0.5 block text-xs text-slate-500">
                  {p.category} · {formatINR(p.sellPrice)}
                </span>
              </span>
              <StockBadge product={p} showLabel={false} />
              {selected && <Check size={18} className="shrink-0 text-indigo-600" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
