/**
 * The only data API the UI is allowed to use. Backed by Cloud Firestore.
 *
 * Everything hangs off the shop that is signed in, so two shops using this app can
 * never see each other's stock:
 *   shops/{shopId}/products/{id}       — one document per product
 *   shops/{shopId}/transactions/{id}   — one document per sale line or delivery
 *   shops/{shopId}/counters/bills      — { value } the bill number counter
 *
 * `createInventoryApi(shop)` binds all of it to one shop once, so no screen can
 * forget to pass the id and read somebody else's shelf. firestore.rules enforces the
 * same boundary on the server; this only makes it convenient.
 *
 * `createdAt` stays an ISO string rather than a Firestore Timestamp: it sorts and
 * range-queries correctly as a string, and it keeps every date helper in the app
 * working unchanged.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  limit as fbLimit,
  runTransaction,
} from 'firebase/firestore'
import { db } from './firebase'
import { DEFAULT_BILL_PREFIX } from '../config/shop'

/** How many recent entries the live subscription keeps in memory. */
export const RECENT_LIMIT = 200

export const PAYMENT_METHODS = ['cash', 'online', 'credit']

const withId = (snap) => ({ id: snap.id, ...snap.data() })

export function createInventoryApi(shop) {
  const shopId = shop.id
  const billPrefix = shop.billPrefix || DEFAULT_BILL_PREFIX

  const productsCol = () => collection(db, 'shops', shopId, 'products')
  const productRef = (id) => doc(db, 'shops', shopId, 'products', id)
  const transactionsCol = () => collection(db, 'shops', shopId, 'transactions')
  const billCounterRef = () => doc(db, 'shops', shopId, 'counters', 'bills')

  /* --------------------------------- products -------------------------------- */

  /** Live product list. Returns an unsubscribe function. */
  function subscribeProducts(onChange, onError) {
    return onSnapshot(
      query(productsCol(), orderBy('name')),
      (snap) => onChange(snap.docs.map(withId)),
      onError,
    )
  }

  async function getProducts() {
    const snap = await getDocs(query(productsCol(), orderBy('name')))
    return snap.docs.map(withId)
  }

  async function getProduct(id) {
    const snap = await getDoc(productRef(id))
    return snap.exists() ? withId(snap) : null
  }

  async function addProduct(data) {
    const now = new Date().toISOString()
    const product = {
      name: data.name.trim(),
      category: data.category,
      costPrice: Number(data.costPrice),
      sellPrice: Number(data.sellPrice),
      quantity: Number(data.quantity),
      lowStockThreshold: Number(data.lowStockThreshold),
      createdAt: now,
      updatedAt: now,
    }
    const ref = await addDoc(productsCol(), product)
    return { id: ref.id, ...product }
  }

  async function updateProduct(id, patch) {
    const clean = { ...patch, updatedAt: new Date().toISOString() }
    delete clean.id

    // Numeric fields arrive from form inputs as strings.
    for (const key of ['costPrice', 'sellPrice', 'quantity', 'lowStockThreshold']) {
      if (key in clean) clean[key] = Number(clean[key])
    }

    await updateDoc(productRef(id), clean)
    return { id, ...clean }
  }

  async function deleteProduct(id) {
    await deleteDoc(productRef(id))
    // Transactions are deliberately kept: the history must still explain where stock
    // went, which is why productName is denormalized onto every transaction.
  }

  /* ------------------------------ stock movement ----------------------------- */

  /**
   * One customer's purchase: several products, one bill number.
   *
   * Runs as a Firestore transaction, so if two people sell the last item at the same
   * moment, one of them fails cleanly instead of the stock count drifting. The bill
   * counter is read and written inside the same transaction, so two bills can never
   * be given the same number.
   */
  async function recordSaleBill(items, note = '', paymentMethod = 'cash', customerAddress = '') {
    if (!Array.isArray(items) || items.length === 0) throw new Error('Add at least one product.')
    if (!PAYMENT_METHODS.includes(paymentMethod)) throw new Error('Choose how the customer paid.')

    // Every sale is named: it goes on the bill, and it is how the sale is found again
    // in History. A credit sale would be worthless without knowing who owes the money.
    if (!note.trim()) {
      throw new Error(
        paymentMethod === 'credit'
          ? 'Write the customer name for a credit sale.'
          : 'Write the customer name.',
      )
    }

    // Sum per product first, so the same item added on two lines cannot slip past the check.
    const wanted = new Map()
    for (const line of items) {
      const qty = Number(line.quantity)
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error('Every line needs a quantity of 1 or more.')
      }
      wanted.set(line.productId, (wanted.get(line.productId) ?? 0) + qty)
    }

    const soldAt = new Date().toISOString()

    return runTransaction(db, async (tx) => {
      // Firestore requires every read before any write.
      const ids = [...wanted.keys()]
      const snaps = await Promise.all(ids.map((id) => tx.get(productRef(id))))
      const counterSnap = await tx.get(billCounterRef())

      const products = new Map()
      ids.forEach((id, i) => {
        const snap = snaps[i]
        if (!snap.exists()) throw new Error('That product no longer exists.')
        const product = snap.data()
        if (wanted.get(id) > product.quantity) {
          throw new Error(`Only ${product.quantity} of ${product.name} in stock.`)
        }
        products.set(id, product)
      })

      const nextCount = (counterSnap.exists() ? counterSnap.data().value : 0) + 1
      const billNumber = `${billPrefix}-${String(nextCount).padStart(4, '0')}`

      tx.set(billCounterRef(), { value: nextCount })

      for (const [id, qty] of wanted) {
        tx.update(productRef(id), {
          quantity: products.get(id).quantity - qty,
          updatedAt: soldAt,
        })
      }

      const lines = []
      for (const line of items) {
        const product = products.get(line.productId)
        const qty = Number(line.quantity)
        const entry = {
          type: 'sale',
          productId: line.productId,
          productName: product.name,
          quantity: qty,
          unitPrice: product.sellPrice,
          total: qty * product.sellPrice,
          note: note.trim(),
          customerAddress: customerAddress.trim(),
          paymentMethod,
          billNumber,
          createdAt: soldAt,
        }
        const ref = doc(transactionsCol())
        tx.set(ref, entry)
        lines.push({ id: ref.id, ...entry })
      }

      return {
        billNumber,
        createdAt: soldAt,
        customer: note.trim(),
        customerAddress: customerAddress.trim(),
        paymentMethod,
        lines,
        total: lines.reduce((sum, l) => sum + l.total, 0),
      }
    })
  }

  /**
   * Stock arriving from a supplier order. `newCostPrice` and `newSellPrice` are both
   * optional: supplier prices move between orders, and when the cost moves the owner
   * usually wants to reprice the shelf at the same moment. Either left blank keeps the
   * current value.
   */
  async function recordRestock(productId, quantity, note = '', newCostPrice, newSellPrice) {
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0) throw new Error('Enter a quantity of 1 or more.')

    const blank = (v) => v === undefined || v === null || v === ''
    const addedAt = new Date().toISOString()

    return runTransaction(db, async (tx) => {
      const ref = productRef(productId)
      const snap = await tx.get(ref)
      if (!snap.exists()) throw new Error('Product not found')

      const product = snap.data()
      const unitPrice = blank(newCostPrice) ? product.costPrice : Number(newCostPrice)
      const sellPrice = blank(newSellPrice) ? product.sellPrice : Number(newSellPrice)

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error('Cost price must be 0 or more.')
      }
      if (!Number.isFinite(sellPrice) || sellPrice < 0) {
        throw new Error('Selling price must be 0 or more.')
      }

      tx.update(ref, {
        quantity: product.quantity + qty,
        costPrice: unitPrice,
        sellPrice,
        updatedAt: addedAt,
      })

      const entry = {
        type: 'restock',
        productId,
        productName: product.name,
        quantity: qty,
        unitPrice,
        total: qty * unitPrice,
        note: note.trim(),
        createdAt: addedAt,
      }
      tx.set(doc(transactionsCol()), entry)

      return {
        product: { id: productId, ...product, quantity: product.quantity + qty },
        transaction: entry,
      }
    })
  }

  /* ------------------------------- transactions ------------------------------ */

  /**
   * Live feed of the most recent entries — powers the dashboard. Deliberately capped:
   * every document read is billed, and the whole history is not needed on every visit.
   */
  function subscribeRecentTransactions(onChange, onError) {
    return onSnapshot(
      query(transactionsCol(), orderBy('createdAt', 'desc'), fbLimit(RECENT_LIMIT)),
      (snap) => onChange(snap.docs.map(withId)),
      onError,
    )
  }

  /**
   * History queries. Only the date range and ordering run on the server; category,
   * payment and text filtering happen on the returned window, which avoids needing
   * composite indexes for every combination.
   */
  async function getTransactions({ from, to, max = 500 } = {}) {
    const clauses = [orderBy('createdAt', 'desc'), fbLimit(max)]
    if (from) clauses.unshift(where('createdAt', '>=', new Date(from).toISOString()))
    if (to) clauses.unshift(where('createdAt', '<=', new Date(to + 'T23:59:59.999').toISOString()))

    const snap = await getDocs(query(transactionsCol(), ...clauses))
    return snap.docs.map(withId)
  }

  /** Every line of one bill, for reprinting from History. */
  async function getBill(billNumber) {
    const snap = await getDocs(query(transactionsCol(), where('billNumber', '==', billNumber)))
    if (snap.empty) return null

    const lines = snap.docs.map(withId)
    return {
      billNumber,
      createdAt: lines[0].createdAt,
      customer: lines[0].note ?? '',
      customerAddress: lines[0].customerAddress ?? '',
      paymentMethod: lines[0].paymentMethod ?? 'cash',
      lines,
      total: lines.reduce((sum, t) => sum + t.total, 0),
    }
  }

  return {
    subscribeProducts,
    getProducts,
    getProduct,
    addProduct,
    updateProduct,
    deleteProduct,
    recordSaleBill,
    recordRestock,
    subscribeRecentTransactions,
    getTransactions,
    getBill,
  }
}
