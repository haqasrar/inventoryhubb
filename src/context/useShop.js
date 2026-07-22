import { createContext, useContext } from 'react'

/**
 * Kept apart from the provider component so that file exports components only —
 * otherwise Vite's fast refresh stops working for the whole context module.
 */
export const ShopContext = createContext(null)

export function useShop() {
  const ctx = useContext(ShopContext)
  if (!ctx) throw new Error('useShop must be used inside a ShopProvider')
  return ctx
}
