import { Banknote, Smartphone, NotebookPen } from 'lucide-react'

/**
 * The single definition of payment methods, shared by the Sell form and History so the
 * wording and colours never drift apart.
 */
export const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'online', label: 'Online', icon: Smartphone },
  { value: 'credit', label: 'Credit', icon: NotebookPen },
]

const STYLES = {
  cash: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  online: 'bg-sky-50 text-sky-700 ring-sky-200',
  credit: 'bg-amber-50 text-amber-700 ring-amber-200',
}

/**
 * Sales recorded before payment methods existed have no `paymentMethod`. They are counted
 * as cash, but deliberately not labelled, so old records are never shown as a fact we
 * cannot actually vouch for.
 */
export function paymentOf(transaction) {
  return transaction.paymentMethod ?? 'cash'
}

export function paymentLabel(method) {
  return PAYMENT_OPTIONS.find((o) => o.value === method)?.label ?? method
}

export function paymentStyle(method) {
  return STYLES[method] ?? 'bg-slate-100 text-slate-600 ring-slate-200'
}
