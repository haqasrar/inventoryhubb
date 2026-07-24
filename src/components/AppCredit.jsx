import { APP } from '../config/shop'

/**
 * Who built the app, and where to write if something is wrong with it.
 *
 * Appears at the foot of every screen — signed out and signed in alike — but never
 * on a printed bill: a customer's receipt carries the shop's name and nobody else's.
 * The bill is printed from its own element, so nothing here reaches paper; the
 * `print:hidden` is belt and braces.
 */
export default function AppCredit({ className = '' }) {
  return (
    <p className={`text-center text-xs leading-relaxed text-slate-400 print:hidden ${className}`}>
      Developed by <span className="font-medium text-slate-500">{APP.developer}</span>
      <span className="mx-1.5 text-slate-300">·</span>
      Any queries, contact{' '}
      <a
        href={`mailto:${APP.contactEmail}`}
        className="font-medium text-indigo-500 underline-offset-2 hover:underline"
      >
        {APP.contactEmail}
      </a>
    </p>
  )
}
