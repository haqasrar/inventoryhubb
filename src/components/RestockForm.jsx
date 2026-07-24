import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, ArrowRight, ScanLine } from 'lucide-react'
import { useInventory } from '../context/useInventory'
import Field, { inputClass } from './Field'
import ProductPicker from './ProductPicker'
import BarcodeScanner from './BarcodeScanner'
import EmptyState from './EmptyState'
import { formatINR } from '../utils/format'
import { findByBarcode } from '../utils/barcode'
import { beepSuccess, beepError } from '../utils/feedback'

/**
 * Stock arriving from a supplier order. One product at a time — unlike a customer sale,
 * deliveries are checked in item by item against the supplier's own bill.
 */
export default function RestockForm() {
  const { products, recordRestock, showToast } = useInventory()

  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [newCostPrice, setNewCostPrice] = useState('')
  const [newSellPrice, setNewSellPrice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [scanning, setScanning] = useState(false)

  const product = products.find((p) => p.id === productId) ?? null

  function selectProduct(id) {
    setProductId(id)
    setError('')
    setNewCostPrice('')
    setNewSellPrice('')
  }

  /** A delivery is one product at a time, so scanning closes after a match. */
  function handleScan(code) {
    const found = findByBarcode(products, code)
    if (!found) {
      beepError()
      setError(`No product found for barcode ${code}.`)
      return
    }
    beepSuccess()
    selectProduct(found.id)
    setScanning(false)
  }
  const qty = Number(quantity)
  const validQty = Number.isFinite(qty) && qty > 0

  const unitPrice = product ? (newCostPrice === '' ? product.costPrice : Number(newCostPrice)) : 0

  const total = validQty ? qty * unitPrice : 0
  const resultingStock = product && validQty ? product.quantity + qty : null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!product) return setError('Choose a product first.')
    if (!validQty) return setError('Enter a quantity of 1 or more.')

    setBusy(true)
    try {
      await recordRestock(product.id, qty, note, newCostPrice, newSellPrice)
      setProductId('')
      setQuantity('')
      setNote('')
      setNewCostPrice('')
      setNewSellPrice('')
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white">
        <EmptyState
          icon={Package}
          title="No products to work with"
          description="Add your products first, then you can record new stock here."
          actionLabel="Go to Products"
          actionTo="/products"
        />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-5">
      {scanning && (
        <BarcodeScanner
          title="Scan the delivered product"
          onScan={handleScan}
          onClose={() => setScanning(false)}
        />
      )}
      <div className="lg:col-span-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-700">Which product arrived?</p>
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              <ScanLine size={16} />
              Scan
            </button>
          </div>
          <Field label="Or tap a product">
            <ProductPicker products={products} selectedId={productId} onSelect={selectProduct} />
          </Field>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <Field label="Quantity">
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value)
                setError('')
              }}
              placeholder="0"
              className={inputClass}
            />
          </Field>

          {product && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="New cost price (₹)"
                  hint={`Now ${formatINR(product.costPrice)}`}
                >
                  <input
                    type="number"
                    min="0"
                    value={newCostPrice}
                    onChange={(e) => {
                      setNewCostPrice(e.target.value)
                      setError('')
                    }}
                    placeholder={String(product.costPrice)}
                    className={inputClass}
                  />
                </Field>

                <Field label="New selling price (₹)" hint={`Now ${formatINR(product.sellPrice)}`}>
                  <input
                    type="number"
                    min="0"
                    value={newSellPrice}
                    onChange={(e) => {
                      setNewSellPrice(e.target.value)
                      setError('')
                    }}
                    placeholder={String(product.sellPrice)}
                    className={inputClass}
                  />
                </Field>
              </div>

              <p className="text-xs text-slate-500">
                Leave either blank to keep it as it is. Changing a price updates the product
                everywhere, not just this delivery.
              </p>

            </>
          )}

          <Field label="Note" hint="Optional — supplier, bill no.">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Sharma Traders"
              className={inputClass}
            />
          </Field>

          {product && validQty && (
            <div className="rounded-lg bg-slate-50 p-4">
              <div className="tabular flex items-baseline justify-between">
                <span className="text-sm text-slate-600">
                  {qty} × {formatINR(unitPrice)}
                </span>
                <span className="text-xl font-semibold">{formatINR(total)}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3 text-sm">
                <span className="text-slate-500">Stock</span>
                <span className="tabular font-medium">{product.quantity}</span>
                <ArrowRight size={14} className="text-slate-400" />
                <span className="tabular font-semibold text-emerald-600">{resultingStock}</span>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !product || !validQty}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Add to stock'}
          </button>

          <p className="text-center text-xs text-slate-400">
            Saved to your{' '}
            <Link to="/history" className="underline hover:text-slate-600">
              history
            </Link>
            .
          </p>
        </div>
      </div>
    </form>
  )
}
