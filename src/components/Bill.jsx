import { useState } from 'react'
import { Printer, X } from 'lucide-react'
import { SHOP } from '../config/shop'
import { formatINR, formatDateTime } from '../utils/format'
import { paymentLabel, paymentOf } from '../utils/payment'

/**
 * Printable customer bill. Shown as an overlay; `window.print()` prints only this
 * element — see the @media print rules in index.css.
 *
 * Labelled "Cash Memo", not "Tax Invoice": it carries no CGST/SGST breakup or HSN
 * codes, so it must not claim to be a GST tax invoice.
 */
export default function Bill({ bill, onClose }) {
  const [hasSignature, setHasSignature] = useState(true)

  if (!bill) return null

  const method = paymentOf(bill)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 print:static print:bg-white">
      <div className="min-h-full px-0 py-0 sm:px-4 sm:py-8 print:p-0">
        <div
          id="printable-bill"
          className="mx-auto max-w-2xl bg-white shadow-xl print:max-w-none print:shadow-none"
        >
          {/* Controls — never printed */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 print:hidden">
            <p className="text-sm font-medium text-slate-600">Bill {bill.billNumber}</p>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                <Printer size={16} />
                Print
              </button>
              <button
                onClick={onClose}
                aria-label="Close bill"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8 sm:py-8">
            {/* Shop header — laid out to match the shop's printed bill book. */}
            <div className="border-b-2 border-slate-900 pb-4 text-center">
              <p className="text-xs text-slate-600">Prop: {SHOP.owner}</p>

              <img
                src="/logo.png"
                alt={SHOP.name}
                className="mx-auto my-2 h-16 w-auto max-w-full object-contain"
              />

              <p className="mx-auto max-w-lg text-[11px] leading-relaxed text-slate-600">
                {SHOP.dealsIn}
              </p>
              <p className="mt-1.5 text-xs font-medium uppercase tracking-wide text-slate-700">
                {SHOP.address}
              </p>

              <div className="tabular mt-1.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-medium text-slate-700">
                <span>GSTIN: {SHOP.gstin}</span>
                <span>Cell: {SHOP.phone}</span>
              </div>
            </div>

            <p className="mt-4 text-center text-sm font-semibold uppercase tracking-widest text-slate-500">
              Cash Memo
            </p>

            {/* Bill meta */}
            <div className="mt-4 space-y-2 border-b border-slate-200 pb-4 text-sm">
              <div className="flex flex-wrap justify-between gap-x-6 gap-y-2">
                <div>
                  <p className="text-slate-500">Invoice No.</p>
                  <p className="tabular font-semibold">{bill.billNumber}</p>
                </div>
                <div>
                  <p className="text-slate-500">Dated</p>
                  <p className="tabular font-medium">{formatDateTime(bill.createdAt)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Payment</p>
                  <p className="font-medium">
                    {paymentLabel(method)}
                    {method === 'credit' && ' (unpaid)'}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-2">
                <p className="text-slate-500">Buyer&apos;s Name</p>
                <p className="font-medium">{bill.customer || '—'}</p>
                {bill.customerAddress && (
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                    {bill.customerAddress}
                  </p>
                )}
              </div>
            </div>

            {/* Items */}
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">Item</th>
                  <th className="py-2 pr-2 text-right">Qty</th>
                  <th className="py-2 pr-2 text-right">Rate</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {bill.lines.map((line, i) => (
                  <tr key={line.id} className="border-b border-slate-100">
                    <td className="tabular py-2.5 pr-2 text-slate-500">{i + 1}</td>
                    <td className="py-2.5 pr-2 font-medium">{line.productName}</td>
                    <td className="tabular py-2.5 pr-2 text-right">{line.quantity}</td>
                    <td className="tabular py-2.5 pr-2 text-right">{formatINR(line.unitPrice)}</td>
                    <td className="tabular py-2.5 text-right font-medium">
                      {formatINR(line.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900">
                  <td colSpan={4} className="py-3 text-right font-semibold">
                    Grand Total
                  </td>
                  <td className="tabular py-3 text-right text-lg font-bold">
                    {formatINR(bill.total)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {method === 'credit' && (
              <p className="mt-4 rounded border border-slate-300 px-3 py-2 text-sm font-medium">
                Amount outstanding: {formatINR(bill.total)}
              </p>
            )}

            <div className="mt-8 flex justify-end">
              <div className="text-center">
                {/* Falls back to blank signing space if signature.png is missing,
                    so a bill never prints with a broken image on it. */}
                {hasSignature ? (
                  <img
                    src="/signature.png"
                    alt=""
                    onError={() => setHasSignature(false)}
                    className="mx-auto h-14 w-auto max-w-[180px] object-contain"
                  />
                ) : (
                  <div className="h-14" />
                )}
                <p className="border-t border-slate-400 px-6 pt-1 text-xs text-slate-600">
                  For {SHOP.name}
                </p>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">Thank you for your business.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
