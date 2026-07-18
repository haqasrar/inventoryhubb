export default function StatCard({ label, value, hint, icon: Icon, tone = 'default' }) {
  const tones = {
    default: 'bg-slate-100 text-slate-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {Icon && (
          <span className={`flex size-9 items-center justify-center rounded-lg ${tones[tone]}`}>
            <Icon size={18} />
          </span>
        )}
      </div>
      {/* Shrinks again at xl, where five cards share a row and a 7-figure amount
          would otherwise be wider than the card. */}
      <p className="tabular mt-3 text-2xl font-semibold tracking-tight sm:text-3xl xl:text-2xl">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
