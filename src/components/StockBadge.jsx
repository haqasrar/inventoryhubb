import { stockStatus } from '../utils/format'

const STYLES = {
  ok: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  low: 'bg-amber-50 text-amber-700 ring-amber-200',
  out: 'bg-red-50 text-red-700 ring-red-200',
}

const LABELS = { ok: 'in stock', low: 'low stock', out: 'out of stock' }

export default function StockBadge({ product, showLabel = true }) {
  const status = stockStatus(product)

  return (
    <span
      className={`tabular inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ring-1 ring-inset ${STYLES[status]}`}
    >
      {product.quantity}
      {showLabel && <span className="text-xs font-medium">{LABELS[status]}</span>}
    </span>
  )
}
