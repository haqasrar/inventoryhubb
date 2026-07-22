import { useShop } from '../context/useShop'
import InstallButton from './InstallButton'

/** Shop identity at the foot of every page. Hidden when a bill is being printed. */
export default function ShopFooter() {
  const { shop } = useShop()

  return (
    <footer className="mt-10 border-t border-slate-200 pt-6 print:hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo-mark.png" alt="" className="size-10 shrink-0 object-contain" />
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
              {[shop.gstin && `GSTIN: ${shop.gstin}`, shop.phone && `Cell: ${shop.phone}`]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          {shop.address && <p>{shop.address}</p>}
        </div>
      </div>
    </footer>
  )
}
