/**
 * Server-side barcode lookup, so the browser can ask "what is this code?" without
 * being blocked by CORS. Proxies to UPCitemdb's trial endpoint and returns a small,
 * clean answer.
 *
 * Reached at /.netlify/functions/barcode-lookup?code=XXXX. The front end only calls
 * it when VITE_BARCODE_LOOKUP=on (see src/services/barcodeLookup.js).
 *
 * Coverage is thin for Indian and furniture goods, and the trial endpoint is rate
 * limited (~100/day per IP), so a "not found" is normal and the app treats it as
 * "type it in yourself".
 */
export default async (req) => {
  const code = new URL(req.url).searchParams.get('code')?.trim()
  const notFound = Response.json({ found: false })

  if (!code) return Response.json({ found: false, error: 'missing code' }, { status: 400 })

  try {
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`,
      { headers: { Accept: 'application/json' } },
    )
    if (!res.ok) return notFound

    const data = await res.json()
    const item = data?.items?.[0]
    if (!item) return notFound

    // UPCitemdb categories look like "Electronics > TV & Video > Televisions".
    // The most specific leaf is the most useful as a shop "type".
    const category = String(item.category || '')
      .split('>')
      .pop()
      .trim()
      .slice(0, 24)

    return Response.json({
      found: true,
      name: String(item.title || '').slice(0, 80),
      category,
    })
  } catch {
    return notFound
  }
}
