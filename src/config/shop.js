/**
 * Nothing here is specific to one business any more.
 *
 * A shop's real details — name, owner, GSTIN, address, bill prefix — live in that
 * shop's own Firestore document (`shops/{shopId}`), filled in by the owner when they
 * create their account. This file only holds the shape of that document and the
 * defaults used before it is filled in.
 */
export const BLANK_SHOP = {
  /** Printed on every bill and shown in the sidebar. */
  name: '',
  /** Proprietor, printed as "Prop: …". */
  owner: '',
  /** Short line under the shop name in the sidebar, e.g. "Electronics & Furniture". */
  tagline: '',
  gstin: '',
  phone: '',
  /** The long line under the shop name on the printed bill book. */
  dealsIn: '',
  address: '',
  /** Prefix for bill numbers, e.g. UE-0001. */
  billPrefix: '',
  /**
   * The kinds of thing this shop sells — every product is filed under one. Owners
   * write their own, because a hardware shop and a chemist have nothing in common
   * here. Never empty: a product has to be filed under something.
   */
  categories: [],
  /**
   * Optional path or URL to the shop's own logo, printed at the top of its bills.
   * Left blank the bill prints the shop name as a heading instead — which is what
   * every shop gets until it has artwork to point at.
   */
  logo: '',
  /**
   * Optional path or URL to the owner's scanned signature, printed above the signing
   * line. Blank prints an empty signing space to sign by hand — which is what every
   * shop gets, because one shop must never print another's signature.
   */
  signature: '',
}

/** Used when an owner leaves the bill prefix blank. */
export const DEFAULT_BILL_PREFIX = 'INV'

/**
 * What a shop starts with before it has said what it sells. Only a starting point —
 * the owner renames or replaces these under Shop details.
 */
export const DEFAULT_CATEGORIES = ['Electronics', 'Furniture']

/** Kept short so the filter dropdown and the product form stay readable. */
export const CATEGORY_RULES = { maxLength: 24, max: 12 }

/**
 * Shops sign in with a username. Firebase Auth only understands email addresses, so
 * every username is turned into one against this domain — `hajinsteel` becomes
 * `hajinsteel@shopstock.local` before the request goes out. Nobody ever sees or
 * types it.
 *
 * The domain is deliberately not a real one: no mail is ever sent to these
 * addresses, and picking a domain somebody else owns would mean handing them
 * addresses that look like our accounts.
 *
 * Firebase refuses two accounts with the same address, which is what makes usernames
 * unique — no separate list of taken names to keep in step.
 */
export const USERNAME_DOMAIN = 'shopstock.local'

/**
 * What a username may be. Kept tight because it becomes an email address: spaces and
 * `@` would build an invalid one, and mixed case would let `Hajin` and `hajin` look
 * like two shops while Firebase treats them as one.
 */
export const USERNAME_RULES = {
  pattern: /^[a-z0-9][a-z0-9._-]{2,19}$/,
  hint: '3–20 characters: lowercase letters, numbers, dot, dash or underscore.',
}

/**
 * The first shop on this installation was created by hand, against a real email
 * address, before accounts were self-service. Its username is mapped to that address
 * so the owner signs in exactly as they always have. Every shop created since maps
 * to USERNAME_DOMAIN instead.
 */
export const LEGACY_LOGIN = {
  username: 'umerenterprises',
  email: 'haqasrar264@gmail.com',
}
