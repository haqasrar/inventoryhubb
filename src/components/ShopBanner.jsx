import { MapPin, BadgeCheck, Phone } from 'lucide-react'
import { SHOP } from '../config/shop'

/**
 * Dashboard header card. The logo is black line art, so it sits on a light panel
 * rather than the dark gradient it would disappear into.
 */
export default function ShopBanner() {
  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex shrink-0 items-center justify-center rounded-xl bg-slate-50 px-6 py-5 sm:w-64">
          <img
            src="/logo.png"
            alt={SHOP.name}
            className="h-16 w-full object-contain sm:h-20"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{SHOP.name}</h2>
          <p className="mt-0.5 text-sm text-slate-600">Prop: {SHOP.owner}</p>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">{SHOP.dealsIn}</p>

          <div className="mt-4 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:gap-x-6">
            <p className="flex items-center gap-2">
              <BadgeCheck size={15} className="shrink-0 text-indigo-500" />
              <span className="tabular font-medium">GSTIN {SHOP.gstin}</span>
            </p>
            <p className="flex items-center gap-2">
              <Phone size={15} className="shrink-0 text-indigo-500" />
              <span className="tabular font-medium">{SHOP.phone}</span>
            </p>
            <p className="flex items-start gap-2">
              <MapPin size={15} className="mt-0.5 shrink-0 text-indigo-500" />
              <span className="leading-relaxed">{SHOP.address}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
