import { useState } from 'react'
import Modal from './Modal'
import Field, { inputClass } from './Field'
import { formatINR } from '../utils/format'

const CATEGORIES = ['Electronics', 'Furniture']

const BLANK = {
  name: '',
  category: 'Electronics',
  costPrice: '',
  sellPrice: '',
  quantity: '',
  lowStockThreshold: '5',
}

function validate(values) {
  const errors = {}
  if (!values.name.trim()) errors.name = 'Give the product a name.'

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

export default function ProductForm({ product, onSubmit, onClose }) {
  const [values, setValues] = useState(product ? { ...product } : BLANK)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }))

  const margin = Number(values.sellPrice) - Number(values.costPrice)
  const showMargin = values.costPrice !== '' && values.sellPrice !== '' && Number.isFinite(margin)

  async function handleSubmit(e) {
    e.preventDefault()
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      await onSubmit(values)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={product ? 'Edit product' : 'Add product'} onClose={onClose}>
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

        <Field label="Type">
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
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
