import { useState } from 'react'
import { Package, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react'
import { useInventory } from '../context/useInventory'
import { formatINR } from '../utils/format'
import { PAYMENT_OPTIONS } from '../utils/payment'
import PageHeader from '../components/PageHeader'
import Field, { inputClass } from '../components/Field'
import ProductPicker from '../components/ProductPicker'
import EmptyState from '../components/EmptyState'
import Bill from '../components/Bill'

export default function Sell() {
  const { products, recordSaleBill, showToast } = useInventory()

  const [cart, setCart] = useState([]) // [{ productId, quantity }]
  const [customer, setCustomer] = useState('')
  const [address, setAddress] = useState('')
  const [payment, setPayment] = useState('cash')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [bill, setBill] = useState(null)

  const onCredit = payment === 'credit'

  const lines = cart.map((line) => {
    const product = products.find((p) => p.id === line.productId)
    return { ...line, product, amount: product ? product.sellPrice * line.quantity : 0 }
  })
  const total = lines.reduce((sum, l) => sum + l.amount, 0)

  /**
   * Adding a product already in the cart bumps its quantity instead of duplicating it.
   * The stock check happens out here, not inside the state updater: an updater must be
   * pure, and showing a toast from within one sets state during render.
   */
  function addToCart(productId) {
    setError('')

    const product = products.find((p) => p.id === productId)
    if (!product) return

    const existing = cart.find((l) => l.productId === productId)
    if (!existing) {
      setCart((current) => [...current, { productId, quantity: 1 }])
      return
    }

    if (existing.quantity >= product.quantity) {
      showToast(`Only ${product.quantity} of ${product.name} in stock.`, 'error')
      return
    }

    setCart((current) =>
      current.map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l)),
    )
  }

  function setQuantity(productId, quantity) {
    const product = products.find((p) => p.id === productId)
    const qty = Math.max(1, Math.min(Number(quantity) || 1, product.quantity))
    setCart((current) => current.map((l) => (l.productId === productId ? { ...l, quantity: qty } : l)))
    setError('')
  }

  function removeLine(productId) {
    setCart((current) => current.filter((l) => l.productId !== productId))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (cart.length === 0) return setError('Add at least one product to the bill.')
    if (!customer.trim()) return setError('Write the customer name.')

    setBusy(true)
    try {
      const created = await recordSaleBill(cart, customer, payment, address)
      setBill(created) // show the bill straight away, ready to print
      setCart([])
      setCustomer('')
      setAddress('')
      setPayment('cash')
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (products.length === 0) {
    return (
      <>
        <PageHeader title="Sell" />
        <div className="rounded-2xl border border-slate-200 bg-white">
          <EmptyState
            icon={Package}
            title="No products to sell"
            description="Add your products first, then you can bill customers here."
            actionLabel="Go to Products"
            actionTo="/products"
          />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Sell a product"
        subtitle="Add everything the customer is buying, then make one bill."
      />

      <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <Field label="Tap a product to add it to the bill">
              <ProductPicker
                products={products}
                selectedIds={cart.map((l) => l.productId)}
                onSelect={addToCart}
                disableOutOfStock
              />
            </Field>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                Bill items{cart.length > 0 && ` (${cart.length})`}
              </p>

              {cart.length === 0 ? (
                <div className="flex flex-col items-center rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center">
                  <ShoppingCart size={22} className="text-slate-300" />
                  <p className="mt-2 text-sm text-slate-500">Nothing added yet</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {lines.map((line) => (
                    <li key={line.productId} className="px-3 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
                          {line.product.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeLine(line.productId)}
                          aria-label={`Remove ${line.product.name}`}
                          className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setQuantity(line.productId, line.quantity - 1)}
                            disabled={line.quantity <= 1}
                            aria-label={`Reduce ${line.product.name}`}
                            className="rounded border border-slate-300 p-1.5 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={line.product.quantity}
                            value={line.quantity}
                            onChange={(e) => setQuantity(line.productId, e.target.value)}
                            aria-label={`Quantity of ${line.product.name}`}
                            className="tabular w-14 rounded border border-slate-300 px-2 py-1 text-center text-sm outline-none focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => setQuantity(line.productId, line.quantity + 1)}
                            disabled={line.quantity >= line.product.quantity}
                            aria-label={`Add one more ${line.product.name}`}
                            className="rounded border border-slate-300 p-1.5 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <p className="tabular text-sm font-semibold">{formatINR(line.amount)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {cart.length > 0 && (
              <div className="tabular flex items-baseline justify-between border-t border-slate-200 pt-3">
                <span className="text-sm font-medium text-slate-600">Total</span>
                <span className="text-2xl font-bold">{formatINR(total)}</span>
              </div>
            )}

            <Field label="How did the customer pay?">
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={payment === value}
                    onClick={() => {
                      setPayment(value)
                      setError('')
                    }}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-sm font-medium transition ${
                      payment === value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </div>
            </Field>

            <Field
              label="Customer name"
              hint={
                onCredit
                  ? 'Required — this is who owes you the money.'
                  : 'Required — printed on the bill, and how you find this sale later.'
              }
            >
              <input
                value={customer}
                onChange={(e) => {
                  setCustomer(e.target.value)
                  setError('')
                }}
                placeholder="e.g. Ramesh Kumar"
                className={inputClass}
              />
            </Field>

            <Field
              label="Customer address"
              hint={
                onCredit
                  ? 'Strongly recommended — this is how you find them to collect payment.'
                  : 'Optional — printed on the bill when filled in.'
              }
            >
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Hajin, Sonawari"
                className={inputClass}
              />
            </Field>

            {onCredit && cart.length > 0 && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                {customer.trim()
                  ? `${customer.trim()} will owe ${formatINR(total)}.`
                  : 'Money not received yet — write the customer name above.'}
              </p>
            )}

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || cart.length === 0 || !customer.trim()}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Saving…' : `Complete sale & make bill${cart.length > 0 ? ` · ${formatINR(total)}` : ''}`}
            </button>
          </div>
        </div>
      </form>

      {bill && <Bill bill={bill} onClose={() => setBill(null)} />}
    </>
  )
}
