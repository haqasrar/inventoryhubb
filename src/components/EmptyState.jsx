import { Link } from 'react-router-dom'

export default function EmptyState({ icon: Icon, title, description, actionLabel, actionTo }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && (
        <span className="flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
          <Icon size={24} />
        </span>
      )}
      <p className="mt-4 font-semibold text-slate-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="mt-5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
