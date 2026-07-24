/**
 * Best-effort "what is this barcode?" lookup, used to pre-fill a new product's name
 * and category from its barcode.
 *
 * Why it goes through our own server, and why it is OFF by default:
 *
 *  - A browser cannot call the public barcode databases directly. They do not send
 *    CORS headers, so `fetch` from the app is blocked outright (verified against
 *    UPCitemdb: "Failed to fetch"). The call has to be made server-side.
 *  - Even server-side, these databases barely cover Indian furniture, iron goods and
 *    local electronics — most of this shop's stock — so a lookup usually finds nothing
 *    and the owner types the details anyway.
 *
 * So this is wired but disabled. Set `VITE_BARCODE_LOOKUP=on` (and deploy the
 * companion Netlify function `netlify/functions/barcode-lookup`) to switch it on.
 * When off, or when anything fails, it returns null and the form falls back to being
 * filled in by hand — which is the reliable path.
 *
 * Returns `{ name, category }` on a hit, or `null`.
 */

const ENABLED = import.meta.env.VITE_BARCODE_LOOKUP === 'on'

export async function lookupBarcode(code) {
  if (!ENABLED) return null

  const c = String(code || '').trim()
  if (!c) return null

  try {
    const res = await fetch(`/.netlify/functions/barcode-lookup?code=${encodeURIComponent(c)}`, {
      signal: AbortSignal.timeout?.(6000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.found) return null
    return { name: String(data.name || ''), category: String(data.category || '') }
  } catch {
    // Offline, blocked, timed out, or the function is not deployed — fall back to manual.
    return null
  }
}
