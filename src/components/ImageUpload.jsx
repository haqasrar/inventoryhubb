import { useRef, useState } from 'react'
import { Upload, Trash2 } from 'lucide-react'
import { fileToDataUrl } from '../utils/image'

/**
 * Picks an image and hands back a small data URL, with the picture shown as it will
 * appear on the bill.
 *
 * The preview sits on a checked background so a transparent logo reads as
 * transparent rather than looking like it has a white box around it — which matters,
 * because a logo with a baked-in white background prints as a grey slab on paper.
 */
export default function ImageUpload({ label, hint, value, onChange, maxWidth, maxHeight }) {
  const inputRef = useRef(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    // Lets the same file be picked again after being removed.
    e.target.value = ''
    if (!file) return

    setError('')
    setBusy(true)
    try {
      onChange(await fileToDataUrl(file, { maxWidth, maxHeight }))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>

      <div className="flex items-center gap-3">
        <div
          className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-300 bg-slate-50"
          style={
            value
              ? {
                  backgroundImage:
                    'linear-gradient(45deg,#e2e8f0 25%,transparent 25%,transparent 75%,#e2e8f0 75%),linear-gradient(45deg,#e2e8f0 25%,transparent 25%,transparent 75%,#e2e8f0 75%)',
                  backgroundSize: '12px 12px',
                  backgroundPosition: '0 0, 6px 6px',
                }
              : undefined
          }
        >
          {value ? (
            <img src={value} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-[11px] text-slate-400">None</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Upload size={15} />
            {busy ? 'Working…' : value ? 'Replace' : 'Upload image'}
          </button>

          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('')
                setError('')
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 size={15} />
              Remove
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      {hint && !error && <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1.5 block text-xs font-medium text-red-600">{error}</span>}
    </div>
  )
}
