import { useCallback, useEffect, useState } from 'react'
import { createShop, getShop, updateShop } from '../services/shopService'
import { useAuth } from './useAuth'
import { ShopContext } from './useShop'

/**
 * Loads the signed-in owner's shop. A one-off read rather than a live subscription:
 * shop details change once a year, and everything below this provider depends on
 * them, so a re-render on every keystroke elsewhere would buy nothing.
 *
 * `shop` being null after loading is not an error — it is a brand new account that
 * has not filled the details in yet, and the setup screen handles it.
 */
export function ShopProvider({ children }) {
  const { user } = useAuth()
  const shopId = user?.uid ?? null

  const [shop, setShop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!shopId) return

    let cancelled = false
    setLoading(true)
    setLoadError('')

    getShop(shopId)
      .then((next) => {
        if (cancelled) return
        setShop(next)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        if (cancelled) return
        setLoadError(
          err?.code === 'permission-denied'
            ? 'This account is not allowed to read its shop. Check the Firestore rules.'
            : 'Could not load your shop details. Check your internet connection.',
        )
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [shopId])

  /** Creates the shop on first use and edits it afterwards — the form is the same one. */
  const saveShop = useCallback(
    async (details) => {
      const next = shop
        ? { ...shop, ...(await updateShop(shopId, details)) }
        : await createShop(shopId, details)
      setShop(next)
      return next
    },
    [shop, shopId],
  )

  return (
    <ShopContext.Provider value={{ shopId, shop, loading, loadError, saveShop }}>
      {children}
    </ShopContext.Provider>
  )
}
