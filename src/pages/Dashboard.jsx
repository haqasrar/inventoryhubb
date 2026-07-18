import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Package,
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
} from 'lucide-react'
import { useInventory } from '../context/useInventory'
import { formatINR, formatDateTime, isToday, stockStatus } from '../utils/format'
import { paymentOf, paymentLabel, paymentStyle } from '../utils/payment'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import StockBadge from '../components/StockBadge'
import EmptyState from '../components/EmptyState'
import ShopBanner from '../components/ShopBanner'

export default function Dashboard() {
  const { products, transactions } = useInventory()

  const stats = useMemo(() => {
    const stockValue = products.reduce((sum, p) => sum + p.costPrice * p.quantity, 0)
    // What the same stock is worth on the shop floor, and the profit sitting between them.
    const sellingValue = products.reduce((sum, p) => sum + p.sellPrice * p.quantity, 0)
    const outOfStock = products.filter((p) => stockStatus(p) === 'out')
    const lowStock = products.filter((p) => stockStatus(p) === 'low')
    const salesToday = transactions.filter((t) => t.type === 'sale' && isToday(t.createdAt))
    const todaysSales = salesToday.reduce((sum, t) => sum + t.total, 0)
    const creditToday = salesToday
      .filter((t) => paymentOf(t) === 'credit')
      .reduce((sum, t) => sum + t.total, 0)

    return {
      stockValue,
      sellingValue,
      outOfStock,
      lowStock,
      todaysSales,
      creditToday,
      salesCount: salesToday.length,
    }
  }, [products, transactions])

  // Out-of-stock first — those are the ones costing the shop a sale right now.
  const needsAttention = [...stats.outOfStock, ...stats.lowStock]
  const recent = transactions.slice(0, 5)

  return (
    <>
      <ShopBanner />

      <PageHeader
        title="Dashboard"
        subtitle="Everything in the shop, at a glance."
        action={
          <Link
            to="/products"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            <Plus size={18} />
            Add product
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Products"
          value={products.length}
          hint={`${products.reduce((s, p) => s + p.quantity, 0)} items in total`}
          icon={Package}
          tone="indigo"
        />
        <StatCard
          label="Stock value"
          value={formatINR(stats.stockValue)}
          hint="What you paid for it"
          icon={IndianRupee}
          tone="emerald"
        />
        <StatCard
          label="Selling value"
          value={formatINR(stats.sellingValue)}
          hint={`${formatINR(stats.sellingValue - stats.stockValue)} profit if all sold`}
          icon={Tag}
          tone="emerald"
        />
        <StatCard
          label="Today's sales"
          value={formatINR(stats.todaysSales)}
          hint={
            stats.creditToday > 0
              ? `${stats.salesCount} sale${stats.salesCount === 1 ? '' : 's'} · ${formatINR(stats.creditToday)} on credit`
              : `${stats.salesCount} sale${stats.salesCount === 1 ? '' : 's'} today`
          }
          icon={TrendingUp}
          tone="indigo"
        />
        <StatCard
          label="Needs reorder"
          value={needsAttention.length}
          hint={`${stats.outOfStock.length} out of stock`}
          icon={AlertTriangle}
          tone={stats.outOfStock.length > 0 ? 'red' : 'amber'}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-5">
        {/* Low stock */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white lg:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold">Running low</h2>
            <Link to="/restock" className="text-sm font-medium text-indigo-600 hover:underline">
              Add stock
            </Link>
          </div>

          {needsAttention.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Everything is well stocked"
              description="No product has dropped below its alert level."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {needsAttention.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {p.category} · alert below {p.lowStockThreshold}
                    </p>
                  </div>
                  <StockBadge product={p} showLabel={false} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent activity */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold">Recent activity</h2>
            <Link to="/history" className="text-sm font-medium text-indigo-600 hover:underline">
              See all
            </Link>
          </div>

          {recent.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Nothing recorded yet"
              description="Sales and new stock will show up here."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((t) => {
                const sale = t.type === 'sale'
                const Icon = sale ? ArrowDownRight : ArrowUpRight
                return (
                  <li key={t.id} className="flex items-start gap-3 px-5 py-3.5">
                    <span
                      className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                        sale ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{t.productName}</p>
                        {sale && t.paymentMethod && (
                          <span
                            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${paymentStyle(t.paymentMethod)}`}
                          >
                            {paymentLabel(t.paymentMethod)}
                          </span>
                        )}
                      </div>
                      <p className="tabular mt-0.5 text-xs text-slate-500">
                        {sale ? 'Sold' : 'Added'} {t.quantity} · {formatDateTime(t.createdAt)}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-sm font-semibold">
                      {formatINR(t.total)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
