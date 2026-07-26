import { Pencil, Trash2, ScanLine } from 'lucide-react'
import StockBadge from './StockBadge'
import { formatINR } from '../utils/format'

/** Scan/attach-barcode button, tinted when the product still has no barcode. */
function BarcodeButton({ product, onScanBarcode }) {
  const has = Boolean((product.barcode || '').trim())
  return (
    <button
      onClick={() => onScanBarcode(product)}
      aria-label={has ? `Change barcode for ${product.name}` : `Add barcode to ${product.name}`}
      title={has ? `Barcode: ${product.barcode}` : 'No barcode — tap to scan or type one'}
      className={`rounded-lg p-2 transition hover:bg-slate-100 ${
        has ? 'text-slate-400 hover:text-slate-700' : 'text-indigo-500 hover:text-indigo-700'
      }`}
    >
      <ScanLine size={16} />
    </button>
  )
}

export default function ProductTable({ products, onEdit, onDelete, onScanBarcode }) {
  return (
    <>
      {/* Desktop table */}
      <table className="hidden w-full text-left sm:table">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-5 py-3">Product</th>
            <th className="px-5 py-3">Type</th>
            <th className="px-5 py-3">Stock</th>
            <th className="px-5 py-3 text-right">Cost</th>
            <th className="px-5 py-3 text-right">Selling price</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((p) => (
            <tr key={p.id} className="transition hover:bg-slate-50">
              <td className="px-5 py-4 font-medium">{p.name}</td>
              <td className="px-5 py-4 text-sm text-slate-500">{p.category}</td>
              <td className="px-5 py-4">
                <StockBadge product={p} />
              </td>
              <td className="tabular px-5 py-4 text-right text-sm text-slate-500">
                {formatINR(p.costPrice)}
              </td>
              <td className="tabular px-5 py-4 text-right font-semibold">
                {formatINR(p.sellPrice)}
              </td>
              <td className="px-5 py-4">
                <div className="flex justify-end gap-1">
                  <BarcodeButton product={p} onScanBarcode={onScanBarcode} />
                  <button
                    onClick={() => onEdit(p)}
                    aria-label={`Edit ${p.name}`}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(p)}
                    aria-label={`Delete ${p.name}`}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile cards */}
      <ul className="divide-y divide-slate-100 sm:hidden">
        {products.map((p) => (
          <li key={p.id} className="px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium leading-snug">{p.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">{p.category}</p>
              </div>
              <StockBadge product={p} showLabel={false} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="tabular text-sm">
                <span className="font-semibold">{formatINR(p.sellPrice)}</span>
                <span className="ml-2 text-slate-400">cost {formatINR(p.costPrice)}</span>
              </div>
              <div className="flex gap-1">
                <BarcodeButton product={p} onScanBarcode={onScanBarcode} />
                <button
                  onClick={() => onEdit(p)}
                  aria-label={`Edit ${p.name}`}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => onDelete(p)}
                  aria-label={`Delete ${p.name}`}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
