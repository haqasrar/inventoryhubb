/**
 * One-time move of the first shop's data into its own space.
 *
 *   products/{id}      ->  shops/{uid}/products/{id}
 *   transactions/{id}  ->  shops/{uid}/transactions/{id}
 *   counters/bills     ->  shops/{uid}/counters/bills
 *
 * Copies, never moves: every original document is left exactly where it is, so if
 * anything looks wrong afterwards the old data is still sitting in the console. The
 * finished firestore.rules simply stop the app from reading it. Delete it yourself,
 * from the console, once you are satisfied.
 *
 * Document ids are preserved, which makes the script safe to run twice — the second
 * run overwrites each copy with the same content instead of duplicating it.
 *
 * Run it as the shop owner, with the shop's own login:
 *
 *   node scripts/migrate-to-shops.mjs
 *
 * See README.md — the temporary rules in firestore.migration.rules have to be live
 * first, or Firestore will refuse to read the old collections.
 */

import { readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore'

/**
 * The details the first shop ran with when they lived in src/config/shop.js. They
 * become that shop's document, and are editable in the app afterwards under
 * "Shop details" — this is only the starting point.
 */
const SEED = {
  name: 'Umer Enterprises',
  owner: 'Umer-ud-Din Ahanger',
  tagline: 'Electronics & Furniture',
  gstin: '01CTBPA2880C1ZJ',
  phone: '9906634041',
  dealsIn:
    'Deals in all kinds of Wooden Furniture, Steel Furniture, Plastic Furniture, Electronics, Stationery, Tailoring Machines, Iron Items and Manufacturing of Iron etc.',
  address: 'Hajin Sonawari, Opposite Bus Stand, Hajin, Bandipora, Jammu and Kashmir — 193501',
  billPrefix: 'UE',
  logo: '/logo.png',
  signature: '/signature.png',
}

/* --------------------------------- plumbing -------------------------------- */

function readEnv(path = '.env.local') {
  const env = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
  }
  return env
}

function ask(question, { hidden = false } = {}) {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
  return new Promise((resolve) => {
    if (hidden) {
      // Keeps the password off the screen and out of the shell history.
      rl._writeToOutput = (chunk) => {
        if (chunk.includes(question)) rl.output.write(chunk)
      }
    }
    rl.question(question, (answer) => {
      if (hidden) rl.output.write('\n')
      rl.close()
      resolve(answer.trim())
    })
  })
}

/** Firestore caps a batch at 500 writes. */
async function copyCollection(db, from, toPath) {
  const snap = await getDocs(collection(db, from))
  if (snap.empty) return 0

  const docs = snap.docs
  for (let i = 0; i < docs.length; i += 400) {
    const batch = writeBatch(db)
    for (const d of docs.slice(i, i + 400)) {
      batch.set(doc(db, ...toPath, d.id), d.data())
    }
    await batch.commit()
    process.stdout.write(`  ${Math.min(i + 400, docs.length)}/${docs.length}\r`)
  }
  return docs.length
}

/* ---------------------------------- script --------------------------------- */

const env = readEnv()
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})

const auth = getAuth(app)
const db = getFirestore(app)

console.log(`Project: ${env.VITE_FIREBASE_PROJECT_ID}\n`)
console.log('Sign in as the shop whose data is being moved.\n')

const email = process.env.MIGRATE_EMAIL || (await ask('Email:    '))
const password = process.env.MIGRATE_PASSWORD || (await ask('Password: ', { hidden: true }))

const { user } = await signInWithEmailAndPassword(auth, email, password)
console.log(`\nSigned in. This shop's data will live at shops/${user.uid}\n`)

const shopRef = doc(db, 'shops', user.uid)
const existing = await getDoc(shopRef)

if (existing.exists()) {
  console.log(`Shop document already exists (${existing.data().name}) — leaving it alone.`)
} else {
  const now = new Date().toISOString()
  await setDoc(shopRef, { ...SEED, ownerUid: user.uid, createdAt: now, updatedAt: now })
  console.log(`Created shop document: ${SEED.name}`)
}

console.log('\nProducts…')
const products = await copyCollection(db, 'products', ['shops', user.uid, 'products'])
console.log(`  copied ${products}`)

console.log('Transactions…')
const transactions = await copyCollection(db, 'transactions', ['shops', user.uid, 'transactions'])
console.log(`  copied ${transactions}`)

console.log('Bill counter…')
const counter = await getDoc(doc(db, 'counters', 'bills'))
if (counter.exists()) {
  await setDoc(doc(db, 'shops', user.uid, 'counters', 'bills'), counter.data())
  console.log(`  next bill will be ${SEED.billPrefix}-${String(counter.data().value + 1).padStart(4, '0')}`)
} else {
  console.log('  none found — bills will start at 0001')
}

console.log('\nDone. Now deploy the finished firestore.rules:')
console.log('  firebase deploy --only firestore:rules')
process.exit(0)
