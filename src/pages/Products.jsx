import { useMemo, useState } from 'react'
import { Plus, Package, SearchX } from 'lucide-react'
import { useInventory } from '../context/useInventory'
import { stockStatus } from '../utils/format'
import PageHeader from '../components/PageHeader'
import SearchFilterBar from '../components/SearchFilterBar'
import ProductTable from '../components/ProductTable'
import ProductForm from '../components/ProductForm'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'

export default function Products() {
  const { products, addProduct, updateProduct, deleteProduct } = useInventory()

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [status, setStatus] = useState('all')
  const [editing, setEditing] = useState(null) // product object, or 'new'
  const [deleting, setDeleting] = useState(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false
      if (category !== 'All' && p.category !== category) return false
      if (status !== 'all' && stockStatus(p) !== status) return false
      return true
    })
  }, [products, query, category, status])

  const hasFilters = query.trim() !== '' || category !== 'All' || status !== 'all'

  return (
    <>
      <PageHeader
        title="Products"
        subtitle={`${products.length} product${products.length === 1 ? '' : 's'} in the shop`}
        action={
          <button
            onClick={() => setEditing('new')}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            <Plus size={18} />
            Add product
          </button>
        }
      />

      <div className="mb-4">
        <SearchFilterBar
          query={query}
          onQuery={setQuery}
          category={category}
          onCategory={setCategory}
          status={status}
          onStatus={setStatus}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Add everything you sell, with its quantity and price, so anyone minding the shop can look it up."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Nothing matches"
            description="Try a different search, or clear the filters."
          />
        ) : (
          <ProductTable products={filtered} onEdit={setEditing} onDelete={setDeleting} />
        )}
      </div>

      {hasFilters && filtered.length > 0 && (
        <p className="mt-3 text-sm text-slate-500">
          Showing {filtered.length} of {products.length} products
        </p>
      )}

      {editing && (
        <ProductForm
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSubmit={(values) =>
            editing === 'new' ? addProduct(values) : updateProduct(editing.id, values)
          }
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete product"
          message={`Remove "${deleting.name}" from the shop? Its past sales stay in the history, but it will no longer appear in your stock list.`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await deleteProduct(deleting)
            setDeleting(null)
          }}
        />
      )}
    </>
  )
}
