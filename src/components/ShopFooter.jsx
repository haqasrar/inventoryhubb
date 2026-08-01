import { useShop } from '../context/useShop'
import { taxIdLabel } from '../config/shop'
import InstallButton from './InstallButton'
import AppCredit from './AppCredit'

/** Shop identity at the foot of every page. Hidden when a bill is being printed. */
export default function ShopFooter() {
  const { shop } = useShop()

  return (
    <footer className="mt-10 border-t border-slate-200 pt-6 print:hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <img
            src={shop.logo || '/app-mark.png'}
            alt=""
            className="size-10 shrink-0 object-contain"
          />
          <div>
            <p className="font-semibold leading-tight">{shop.name}</p>
            {shop.tagline && <p className="text-xs text-slate-500">{shop.tagline}</p>}
          </div>
        </div>

        {/* The sidebar is desktop-only, so this is the install button phones see. */}
        <div className="lg:hidden">
          <InstallButton />
        </div>

        <div className="max-w-sm space-y-1 text-xs leading-relaxed text-slate-500 sm:text-right">
          {shop.owner && <p>Prop: {shop.owner}</p>}
          {(shop.gstin || shop.phone) && (
            <p className="tabular">
              {[shop.gstin && `${taxIdLabel(shop)}: ${shop.gstin}`, shop.phone && `Cell: ${shop.phone}`]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          {shop.address && <p>{shop.address}</p>}
        </div>
      </div>

      {/* Kept clearly apart from the shop's own details above — this is about the app,
          not about the shop. */}
      <AppCredit className="mt-6 border-t border-slate-100 pt-4" />
    </footer>
  )
}
