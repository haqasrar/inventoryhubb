/**
 * The username → login-email lookup that lets a shop sign in with its username even
 * though Firebase Auth only ever knows an email address.
 *
 * Each account owns one document, `usernames/{username}`, holding the email its login
 * actually uses and the uid behind it. Sign-in reads it *before* there is any logged-in
 * user, so firestore.rules make these documents world-readable — the trade-off that
 * comes with letting people sign in by a name instead of an email.
 *
 * A document can only be created once, by the account it belongs to, which is what
 * keeps usernames unique: a second shop trying to take the same name writes over
 * someone else's document, and the rules refuse it.
 */

import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from './firebase'

export const usernameDoc = (username) => doc(db, 'usernames', username)

/** The email a username signs in with, or null if the name has no lookup yet. */
export async function getUsernameEmail(username) {
  const name = (username ?? '').trim().toLowerCase()
  if (!name) return null
  try {
    const snap = await getDoc(usernameDoc(name))
    return snap.exists() ? snap.data().email : null
  } catch {
    // Offline, or the read was blocked. The caller falls back to the synthetic
    // address so existing shops can still sign in without the network.
    return null
  }
}

/** Records that `username` signs in with `email`. Fails (by the rules) if taken by someone else. */
export async function claimUsername(username, uid, email) {
  const name = username.trim().toLowerCase()
  await setDoc(usernameDoc(name), { uid, email })
}

/**
 * Creates the lookup for a shop that signed up before this table existed, so its
 * username is reserved from now on. Best-effort: it already logs in fine without one.
 */
export async function ensureUsername(username, uid, email) {
  const name = (username ?? '').trim().toLowerCase()
  if (!name) return
  try {
    const snap = await getDoc(usernameDoc(name))
    if (!snap.exists()) await setDoc(usernameDoc(name), { uid, email })
  } catch {
    // No lookup is not fatal — sign-in already succeeded through the fallback.
  }
}

/** The username an account signs in with, found from its uid, or null. */
export async function findUsernameByUid(uid) {
  try {
    const q = query(collection(db, 'usernames'), where('uid', '==', uid))
    const snap = await getDocs(q)
    return snap.empty ? null : snap.docs[0].id
  } catch {
    return null
  }
}

/** Points an existing username's lookup at a new login email, after the email is changed. */
export async function repointUsernameEmail(username, email) {
  if (!username) return
  await updateDoc(usernameDoc(username), { email })
}
