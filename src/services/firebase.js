import { initializeApp } from 'firebase/app'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

/**
 * Config comes from .env.local (see .env.example). These values are not secrets —
 * Firebase ships them to every browser. The data is protected by the login and by
 * firestore.rules, not by hiding this config.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

const app = isConfigured ? initializeApp(firebaseConfig) : null

/**
 * Firestore keeps a copy of everything it has read in IndexedDB, so the shop can
 * still look up stock and prices when the connection drops — the whole point of
 * the app for whoever is minding the counter.
 *
 * Recording a sale still needs the network: it runs as a transaction, and those
 * cannot be resolved offline.
 */
export const db = app
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  : null

export const auth = app ? getAuth(app) : null
