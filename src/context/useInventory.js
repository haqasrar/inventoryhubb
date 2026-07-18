import { createContext, useContext } from 'react'

/**
 * Kept apart from the provider component so that file exports components only —
 * otherwise Vite's fast refresh stops working for the whole context module.
 */
export const InventoryContext = createContext(null)

export function useInventory() {
  const ctx = useContext(InventoryContext)
  if (!ctx) throw new Error('useInventory must be used inside an InventoryProvider')
  return ctx
}
