import { useCallback, useEffect, useState } from 'react'
import { ScanLine, X, Plus } from 'lucide-react'
import Modal from './Modal'
import Field, { inputClass } from './Field'
import BarcodeScanner from './BarcodeScanner'
import { formatINR } from '../utils/format'
import { findByBarcode } from '../utils/barcode'
import { beepSuccess } from '../utils/feedback'
import { lookupBarcode } from '../services/barcodeLookup'
import { CATEGORY_RULES } from '../config/shop'
import { useShop } from '../context/useShop'
import { useInventory } from '../context/useInventory'

const BLANK = {
  name: '',
  barcode: '',
  costPrice: '',
  sellPrice: '',
  quantity: '',
  lowStockThreshold: '5',
}

function validate(values) {
  const errors = {}
  if (!values.name.trim()) errors.name = 'Give the product a name.'
  if (!values.category || !values.category.trim()) {
    errors.category = 'Choose or add a product type.'
  }

  for (const [key, label] of [
    ['costPrice', 'Cost price'],
    ['sellPrice', 'Selling price'],
    ['quantity', 'Quantity'],
    ['lowStockThreshold', 'Low stock alert'],
  ]) {
    const n = Number(values[key])
    if (values[key] === '' || !Number.isFinite(n) || n < 0) {
      errors[key] = `${label} must be a number of 0 or more.`
    }
  }

  return errors
}

export default function ProductForm({ product, presetBarcode = '', onSubmit, onClose }) {
  const { shop, saveShop } = useShop()
  const { products } = useInventory()

  const [values, setValues] = useState(
    product
      ? { ...BLANK, ...product }
      : { ...BLANK, category: shop.categories[0], barcode: presetBarcode },
  )
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  // True while typing a brand-new type rather than picking an existing one.
  const [addingType, setAddingType] = useState(false)

  // If this barcode is already on a different product, say so — but do not block
  // saving. Cheap and local goods often share a printed barcode or have none, so the
  // owner has to be able to add the product anyway. Suppressed while saving so the
  // product does not appear to clash with itself once the live list updates.
  const clash = values.barcode.trim() ? findByBarcode(products, values.barcode) : null
  const duplicate = !saving && clash && clash.id !== product?.id ? clash : null

  const existingType = (name) =>
    shop.categories.find((c) => c.toLowerCase() === String(name).trim().toLowerCase())

  /**
   * Best-effort: turn a barcode into a name and type. Disabled unless the online
   * lookup is switched on, so normally this returns nothing and the owner fills the
   * form in — the reliable path. When it does return a type the shop has never used,
   * it is dropped straight into the new-type box so the product lands in a new type.
   */
  const runLookup = useCallback(
    async (code) => {
      const hit = await lookupBarcode(code)
      if (!hit) return
      setValues((v) => ({
        ...v,
        name: v.name.trim() ? v.name : hit.name,
        category: hit.category ? (existingType(hit.category) ?? hit.category) : v.category,
      }))
      if (hit.category && !existingType(hit.category)) setAddingType(true)
    },
    // existingType closes over shop.categories, which does not change inside the modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // A product opened straight from a scan of an unknown barcode: try to fill it in.
  useEffect(() => {
    if (!product && presetBarcode) runLookup(presetBarcode)
  }, [product, presetBarcode, runLookup])

  function handleScanned(code) {
    setValues((v) => ({ ...v, barcode: code }))
    setScanning(false)
    beepSuccess()
    runLookup(code)
  }

  // A product keeps whatever it was filed under, even if the owner has since removed
  // that type — editing its price must not silently re-file it under something else.
  const choices = shop.categories.includes(values.category)
    ? shop.categories
    : [...shop.categories, values.category]

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }))

  const margin = Number(values.sellPrice) - Number(values.costPrice)
  const showMargin = values.costPrice !== '' && values.sellPrice !== '' && Number.isFinite(margin)

  async function handleSubmit(e) {
    e.preventDefault()
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const typed = values.category.trim()
    const known = existingType(typed)

    // A type the shop has never used is added to its list, so the product has somewhere
    // to be filed and the new type shows up in the filters from now on.
    if (!known && shop.categories.length >= CATEGORY_RULES.max) {
      setErrors({
        category: `You already have ${CATEGORY_RULES.max} types, the most allowed. Remove one under Shop details first.`,
      })
      return
    }

    setSaving(true)
    try {
      if (!known) await saveShop({ ...shop, categories: [...shop.categories, typed] })
      // Keep the owner's existing spelling when the type already exists.
      await onSubmit({ ...values, category: known ?? typed })
      onClose()
    } catch (err) {
      setErrors({ category: err?.message || 'Could not save. Try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={product ? 'Edit product' : 'Add product'} onClose={onClose}>
      {scanning && (
        <BarcodeScanner
          title="Scan the product barcode"
          onScan={handleScanned}
          onClose={() => setScanning(false)}
        />
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Product name" error={errors.name}>
          <input
            autoFocus
            value={values.name}
            onChange={set('name')}
            placeholder="e.g. LG 43&quot; Smart LED TV"
            className={inputClass}
          />
        </Field>

        <Field label="Type" error={errors.category}>
          {addingType ? (
            <>
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={values.category}
                  onChange={set('category')}
                  maxLength={CATEGORY_RULES.maxLength}
                  placeholder="e.g. Iron Items"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => {
                    setAddingType(false)
                    setValues((v) => ({ ...v, category: shop.categories[0] }))
                  }}
                  className="shrink-0 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Added to your product types when you save.
              </p>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {choices.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setValues((v) => ({ ...v, category: c }))}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                      values.category === c
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setAddingType(true)
                  setValues((v) => ({ ...v, category: '' }))
                }}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 transition hover:underline"
              >
                <Plus size={15} />
                New type
              </button>
            </>
          )}
        </Field>

        <Field
          label="Barcode"
          hint="Optional — scan or type it so this product can be found by scanning later."
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                value={values.barcode}
                onChange={set('barcode')}
                inputMode="numeric"
                placeholder="No barcode"
                className={`${inputClass} ${values.barcode ? 'pr-9' : ''}`}
              />
              {values.barcode && (
                <button
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, barcode: '' }))}
                  aria-label="Clear barcode"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
            >
              <ScanLine size={16} />
              Scan
            </button>
          </div>
          {duplicate && (
            <p className="mt-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              This barcode is also on “{duplicate.name}”. You can still save, but scanning it will
              only find one of them — leave it blank if this is a different product.
            </p>
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cost price (₹)" hint="What you paid" error={errors.costPrice}>
            <input
              type="number"
              min="0"
              value={values.costPrice}
              onChange={set('costPrice')}
              className={inputClass}
            />
          </Field>
          <Field label="Selling price (₹)" hint="What the customer pays" error={errors.sellPrice}>
            <input
              type="number"
              min="0"
              value={values.sellPrice}
              onChange={set('sellPrice')}
              className={inputClass}
            />
          </Field>
        </div>

        {showMargin && (
          <p
            className={`tabular rounded-lg px-3 py-2 text-sm ${
              margin < 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {margin < 0
              ? `Selling below cost — losing ${formatINR(Math.abs(margin))} per item.`
              : `Profit ${formatINR(margin)} per item.`}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quantity in stock" error={errors.quantity}>
            <input
              type="number"
              min="0"
              value={values.quantity}
              onChange={set('quantity')}
              className={inputClass}
            />
          </Field>
          <Field
            label="Alert me below"
            hint="Warns you to reorder"
            error={errors.lowStockThreshold}
          >
            <input
              type="number"
              min="0"
              value={values.lowStockThreshold}
              onChange={set('lowStockThreshold')}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : product ? 'Save changes' : 'Add product'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
