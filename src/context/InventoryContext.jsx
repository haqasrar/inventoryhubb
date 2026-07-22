import { useCallback, useEffect, useMemo, useState } from 'react'
import { createInventoryApi } from '../services/inventoryService'
import { useShop } from './useShop'
import { InventoryContext } from './useInventory'

export function InventoryProvider({ children }) {
  const { shop } = useShop()

  /**
   * Bound to this shop, so every call below reads and writes under `shops/{id}`.
   * Rebuilt if the signed-in shop changes, which tears the subscriptions below down
   * and starts them again against the new shop.
   */
  const api = useMemo(
    () => createInventoryApi({ id: shop.id, billPrefix: shop.billPrefix }),
    [shop.id, shop.billPrefix],
  )

  const [products, setProducts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, tone = 'success') => {
    setToast({ message, tone, id: Date.now() })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  /**
   * Live subscriptions rather than one-off reads: when your son records a sale on his
   * phone, every other open device updates on its own.
   */
  useEffect(() => {
    let productsReady = false
    let recentReady = false
    const settle = () => {
      if (productsReady && recentReady) setLoading(false)
    }

    const onError = (err) => {
      console.error(err)
      setLoadError(
        err?.code === 'permission-denied'
          ? 'This account cannot read the shop data. Check the Firestore rules.'
          : 'Could not reach the database. Check your internet connection.',
      )
      setLoading(false)
    }

    const stopProducts = api.subscribeProducts((next) => {
      setProducts(next)
      productsReady = true
      settle()
    }, onError)

    const stopRecent = api.subscribeRecentTransactions((next) => {
      setTransactions(next)
      recentReady = true
      settle()
    }, onError)

    return () => {
      stopProducts()
      stopRecent()
    }
  }, [api])

  /* Mutations write to Firestore; the subscriptions above push the result back. */

  const addProduct = useCallback(
    async (data) => {
      const product = await api.addProduct(data)
      showToast(`${product.name} added with ${product.quantity} in stock.`)
      return product
    },
    [api, showToast],
  )

  const updateProduct = useCallback(
    async (id, patch) => {
      const product = await api.updateProduct(id, patch)
      showToast(`${patch.name ?? 'Product'} updated.`)
      return product
    },
    [api, showToast],
  )

  const deleteProduct = useCallback(
    async (product) => {
      await api.deleteProduct(product.id)
      showToast(`${product.name} removed from the shop.`)
    },
    [api, showToast],
  )

  const recordSaleBill = useCallback(
    async (items, note, paymentMethod, customerAddress) => {
      const bill = await api.recordSaleBill(items, note, paymentMethod, customerAddress)
      const count = bill.lines.length
      showToast(
        `Bill ${bill.billNumber} created — ${count} item${count === 1 ? '' : 's'}${
          paymentMethod === 'credit' ? ', on credit' : ''
        }.`,
      )
      return bill
    },
    [api, showToast],
  )

  const recordRestock = useCallback(
    async (productId, quantity, note, newCostPrice, newSellPrice) => {
      const { product } = await api.recordRestock(
        productId,
        quantity,
        note,
        newCostPrice,
        newSellPrice,
      )
      showToast(`Added ${quantity} × ${product.name}. Now ${product.quantity} in stock.`)
      return product
    },
    [api, showToast],
  )

  const getBill = useCallback((billNumber) => api.getBill(billNumber), [api])
  const getTransactions = useCallback((opts) => api.getTransactions(opts), [api])

  const value = {
    products,
    transactions,
    loading,
    loadError,
    toast,
    showToast,
    dismissToast: () => setToast(null),
    addProduct,
    updateProduct,
    deleteProduct,
    recordSaleBill,
    recordRestock,
    getBill,
    getTransactions,
  }

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
}
