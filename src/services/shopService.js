/**
 * Each shop is one document: `shops/{shopId}`, holding the details that get printed
 * on that shop's bills. The stock and history live in subcollections underneath it,
 * which is what keeps one shop's data out of every other shop's app.
 *
 * `shopId` is deliberately the owner's Firebase Auth uid. That means no lookup table
 * is needed to find a signed-in owner's shop, and firestore.rules can decide access
 * with a plain `request.auth.uid == shopId` — no extra document read per request.
 */

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import {
  BLANK_SHOP,
  CATEGORY_RULES,
  DEFAULT_BILL_PREFIX,
  DEFAULT_CATEGORIES,
} from '../config/shop'

export const shopDoc = (shopId) => doc(db, 'shops', shopId)

/**
 * Fills in every field the screens read. A shop saved before a field existed must
 * not put the word "undefined" on a customer's bill.
 */
function normalize(id, data) {
  return {
    id,
    ...BLANK_SHOP,
    ...data,
    billPrefix: data.billPrefix || DEFAULT_BILL_PREFIX,
    // Shops saved before categories existed have none. Falling back here rather than
    // migrating means the product form always has something to offer.
    categories: data.categories?.length ? data.categories : DEFAULT_CATEGORIES,
  }
}

/**
 * Trims and de-duplicates the list of things a shop sells. Compared case-insensitively
 * so "Paints" and "paints" cannot both sit in the filter dropdown, but the owner's own
 * capitalisation is what gets kept and shown.
 */
export function cleanCategories(list) {
  const seen = new Set()
  const out = []

  for (const raw of Array.isArray(list) ? list : []) {
    const name = String(raw ?? '')
      .trim()
      .slice(0, CATEGORY_RULES.maxLength)
    const key = name.toLowerCase()
    if (!name || seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }

  return out.slice(0, CATEGORY_RULES.max)
}

/** Trims what was typed and rejects the fields a bill cannot be printed without. */
export function cleanDetails(details) {
  const clean = {}
  for (const key of Object.keys(BLANK_SHOP)) {
    if (key === 'categories') continue
    clean[key] = String(details[key] ?? '').trim()
  }

  clean.categories = cleanCategories(details.categories)
  if (clean.categories.length === 0) {
    throw new Error('Add at least one type of product the shop sells.')
  }

  if (!clean.name) throw new Error('Enter the shop name.')
  if (!clean.owner) throw new Error("Enter the owner's name.")

  // Written without its spaces, and uppercased, so the same number typed three
  // different ways prints the same way on every bill.
  clean.gstin = clean.gstin.replace(/\s+/g, '').toUpperCase()
  if (!clean.gstin) throw new Error('Enter the shop’s GST number.')
  if (!/^[0-9A-Z]{15}$/.test(clean.gstin)) {
    throw new Error('A GST number is exactly 15 letters and numbers, like 01CTBPA2880C1ZJ.')
  }

  // Bill numbers read as UE-0001, so the prefix is uppercased for the owner.
  clean.billPrefix = (clean.billPrefix || DEFAULT_BILL_PREFIX).toUpperCase()
  return clean
}

/** The signed-in owner's shop, or null if they have not set it up yet. */
export async function getShop(shopId) {
  const snap = await getDoc(shopDoc(shopId))
  return snap.exists() ? normalize(snap.id, snap.data()) : null
}

export async function createShop(shopId, details) {
  const now = new Date().toISOString()
  const shop = {
    ...cleanDetails(details),
    // Same value as the document id today. Stored anyway so that letting a shop have
    // more than one staff login later does not need a data migration.
    ownerUid: shopId,
    createdAt: now,
    updatedAt: now,
  }
  await setDoc(shopDoc(shopId), shop)
  return normalize(shopId, shop)
}

export async function updateShop(shopId, details) {
  const patch = { ...cleanDetails(details), updatedAt: new Date().toISOString() }
  await updateDoc(shopDoc(shopId), patch)
  return patch
}
