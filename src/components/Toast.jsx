import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import { useInventory } from '../context/useInventory'

export default function Toast() {
  const { toast, dismissToast } = useInventory()
  if (!toast) return null

  const isError = toast.tone === 'error'
  const Icon = isError ? AlertCircle : CheckCircle2

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-24 z-50 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-96"
    >
      <div
        className={`flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg ring-1 ${
          isError ? 'bg-red-600 text-white ring-red-700' : 'bg-slate-900 text-white ring-slate-800'
        }`}
      >
        <Icon size={20} className="mt-0.5 shrink-0" />
        <p className="flex-1 text-sm leading-snug">{toast.message}</p>
        <button
          onClick={dismissToast}
          aria-label="Dismiss"
          className="shrink-0 rounded p-0.5 opacity-70 transition hover:opacity-100"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
