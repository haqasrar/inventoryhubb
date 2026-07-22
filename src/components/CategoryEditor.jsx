import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { CATEGORY_RULES } from '../config/shop'
import { inputClass } from './Field'

/**
 * The kinds of thing this shop sells. Every product is filed under one of these, and
 * they drive the filter on the Products screen and the breakdown on the Dashboard.
 *
 * Removing one does not touch the products already filed under it — their old label
 * keeps printing and keeps showing in History, because rewriting a shop's records to
 * match a dropdown edit would be far worse than an extra line on a screen.
 */
export default function CategoryEditor({ value, onChange }) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  const categories = value ?? []
  const full = categories.length >= CATEGORY_RULES.max

  function add() {
    const name = draft.trim()
    if (!name) return

    if (categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      setError(`“${name}” is already in the list.`)
      return
    }
    if (full) {
      setError(`That is as many as fit — ${CATEGORY_RULES.max} at most.`)
      return
    }

    onChange([...categories, name])
    setDraft('')
    setError('')
  }

  function remove(name) {
    onChange(categories.filter((c) => c !== name))
    setError('')
  }

  return (
    <div className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">What the shop sells</span>

      {categories.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {categories.map((c) => (
            <li
              key={c}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 py-1.5 pl-3 pr-1.5 text-sm font-medium text-indigo-700"
            >
              {c}
              <button
                type="button"
                onClick={() => remove(c)}
                aria-label={`Remove ${c}`}
                className="rounded p-0.5 text-indigo-400 transition hover:bg-indigo-100 hover:text-indigo-700"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setError('')
          }}
          // Enter adds a category. Without this it would submit the whole form, and
          // the half-typed word would be lost.
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          maxLength={CATEGORY_RULES.maxLength}
          placeholder="e.g. Hardware"
          className={inputClass}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <Plus size={15} />
          Add
        </button>
      </div>

      {error ? (
        <span className="mt-1.5 block text-xs font-medium text-red-600">{error}</span>
      ) : (
        <span className="mt-1.5 block text-xs text-slate-500">
          Every product is filed under one of these. Products already filed under a type you remove
          keep it.
        </span>
      )}
    </div>
  )
}
