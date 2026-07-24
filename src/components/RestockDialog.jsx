import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useInventory } from '../context/useInventory'
import Modal from './Modal'
import Field, { inputClass } from './Field'
import { formatINR } from '../utils/format'

/**
 * Add stock to a product that already exists — the "this was restocked" half of a
 * scan. Deliberately compact: a scan already identified the product, so all that is
 * left is how many arrived (and, if the supplier's price moved, the new prices).
 */
export default function RestockDialog({ product, onClose }) {
  const { recordRestock, showToast } = useInventory()

  const [quantity, setQuantity] = useState('1')
  const [newCostPrice, setNewCostPrice] = useState('')
  const [newSellPrice, setNewSellPrice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const qty = Number(quantity)
  const validQty = Number.isFinite(qty) && qty > 0
  const resultingStock = validQty ? product.quantity + qty : null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validQty) return setError('Enter a quantity of 1 or more.')

    setBusy(true)
    try {
      await recordRestock(product.id, qty, '', newCostPrice, newSellPrice)
      onClose()
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Add stock" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <p className="font-medium">{product.name}</p>
          <p className="tabular mt-0.5 text-sm text-slate-500">
            {product.category} · {product.quantity} in stock now
          </p>
        </div>

        <Field label="How many arrived?">
          <input
            autoFocus
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value)
              setError('')
            }}
            className={inputClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New cost price (₹)" hint={`Now ${formatINR(product.costPrice)}`}>
            <input
              type="number"
              min="0"
              value={newCostPrice}
              onChange={(e) => setNewCostPrice(e.target.value)}
              placeholder={String(product.costPrice)}
              className={inputClass}
            />
          </Field>
          <Field label="New selling price (₹)" hint={`Now ${formatINR(product.sellPrice)}`}>
            <input
              type="number"
              min="0"
              value={newSellPrice}
              onChange={(e) => setNewSellPrice(e.target.value)}
              placeholder={String(product.sellPrice)}
              className={inputClass}
            />
          </Field>
        </div>

        <p className="text-xs text-slate-500">
          Leave either blank to keep it. Changing a price updates the product everywhere.
        </p>

        {validQty && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm">
            <span className="text-slate-600">Stock</span>
            <span className="tabular font-medium">{product.quantity}</span>
            <ArrowRight size={14} className="text-slate-400" />
            <span className="tabular font-semibold text-emerald-700">{resultingStock}</span>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
        )}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !validQty}
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Add to stock'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
