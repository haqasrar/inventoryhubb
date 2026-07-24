/** The one place that decides whether a scanned code matches a product. */
export function findByBarcode(products, code) {
  const target = String(code || '').trim()
  if (!target) return null
  return products.find((p) => (p.barcode || '').trim() === target) ?? null
}
