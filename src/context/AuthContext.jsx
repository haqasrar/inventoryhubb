import { useCallback, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  setPersistence,
  browserLocalPersistence,
  updatePassword,
  updateEmail,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  deleteUser,
  EmailAuthProvider,
} from 'firebase/auth'
import { auth } from '../services/firebase'
import { AuthContext } from './useAuth'
import { LEGACY_LOGIN, USERNAME_DOMAIN, USERNAME_RULES } from '../config/shop'
import {
  claimUsername,
  ensureUsername,
  findUsernameByUid,
  getUsernameEmail,
  repointUsernameEmail,
} from '../services/accountService'

/** Firebase's own error codes are not something a shopkeeper should have to read. */
function friendlyError(code) {
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address does not look right.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Wrong username or password.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a minute and try again.'
    case 'auth/network-request-failed':
      return 'No internet connection.'
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.'
    case 'auth/requires-recent-login':
      return 'Please sign in again before changing this.'
    case 'auth/email-already-in-use':
      return 'That email already has an account. One email, one shop.'
    case 'auth/operation-not-allowed':
      return 'Changing the email is switched off in the Firebase console.'
    default:
      return 'Could not complete the action. Please try again.'
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Works out which email a typed username signs in with.
 *
 * New shops sign up with a real email, kept in the `usernames` lookup. Shops created
 * before that lookup existed fall back to the synthetic `name@shopstock.local` address
 * they were made with, so nobody is locked out. The one hand-made legacy account keeps
 * its own real address.
 */
async function resolveEmail(typed) {
  const username = (typed ?? '').trim().toLowerCase()
  if (!username) throw new Error('Enter your username.')

  if (username === LEGACY_LOGIN.username.toLowerCase() && LEGACY_LOGIN.email) {
    return LEGACY_LOGIN.email
  }

  const looked = await getUsernameEmail(username)
  return looked || `${username}@${USERNAME_DOMAIN}`
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(() => {})

    return onAuthStateChanged(auth, (next) => {
      setUser(next)
      setChecking(false)
    })
  }, [])

  const signIn = useCallback(async (username, password) => {
    const name = (username ?? '').trim().toLowerCase()
    // resolveEmail throws its own already-readable messages, which have no Firebase
    // error code — those must not be flattened into the generic fallback.
    const email = await resolveEmail(name)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      throw new Error(err.code ? friendlyError(err.code) : err.message)
    }
    // Reserve the username of a shop that predates the lookup, so nobody else can take
    // it now. Best-effort and silent: the sign-in has already succeeded.
    ensureUsername(name, auth.currentUser.uid, email)
  }, [])

  /**
   * Opens a new shop's account against a real email address. The email is the account's
   * true identity — that is what lets a forgotten password be reset by email — while the
   * username is kept in the lookup so sign-in can still be by name. The shop's own
   * details are asked for on the next screen, once there is a uid to file them under.
   */
  const signUp = useCallback(async (username, email, password) => {
    const name = (username ?? '').trim().toLowerCase()
    const mail = (email ?? '').trim().toLowerCase()

    if (!USERNAME_RULES.pattern.test(name)) {
      throw new Error(`That username cannot be used. ${USERNAME_RULES.hint}`)
    }
    if (name === LEGACY_LOGIN.username.toLowerCase()) {
      throw new Error('That username is already taken. Try another one.')
    }
    if (!EMAIL_RE.test(mail)) throw new Error('Enter a valid email address, like you@example.com.')
    if (password.length < 6) throw new Error('Password must be at least 6 characters.')

    // Refuse a name already spoken for before creating the login, so a rejected signup
    // does not leave an orphan account behind.
    if (await getUsernameEmail(name)) {
      throw new Error('That username is already taken. Try another one.')
    }

    try {
      // Firebase refuses a second account on the same email, so this is also the check
      // that keeps one email to one shop.
      await createUserWithEmailAndPassword(auth, mail, password)
    } catch (err) {
      throw new Error(err.code ? friendlyError(err.code) : err.message)
    }

    try {
      await claimUsername(name, auth.currentUser.uid, mail)
    } catch {
      // The name was taken in the moment between the check and the write. Roll the
      // half-made account back so the email is free to try again.
      await deleteUser(auth.currentUser).catch(() => {})
      throw new Error('That username was just taken. Try another one.')
    }
  }, [])

  const signOut = useCallback(() => fbSignOut(auth), [])

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    if (!user) throw new Error('Not signed in.')
    if (newPassword.length < 6) throw new Error('Password must be at least 6 characters.')

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, newPassword)
    } catch (err) {
      throw new Error(friendlyError(err.code))
    }
  }, [user])

  /**
   * Changes the email the account signs in and receives reset links at. The current
   * password is asked for first, so a walked-away-from session cannot quietly move the
   * login somewhere else. The username lookup is repointed only after the email itself
   * has changed, so the two can never disagree.
   */
  const changeEmail = useCallback(async (currentPassword, newEmail) => {
    if (!user) throw new Error('Not signed in.')
    const mail = (newEmail ?? '').trim().toLowerCase()
    if (!EMAIL_RE.test(mail)) throw new Error('Enter a valid email address, like you@example.com.')
    if (mail === (user.email ?? '').toLowerCase()) {
      throw new Error('That is already the email on this account.')
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)
      await updateEmail(user, mail)
    } catch (err) {
      throw new Error(friendlyError(err.code))
    }

    // The lookup write is checked against the token's email, so make sure the token
    // carries the new address before repointing it.
    await auth.currentUser.getIdToken(true).catch(() => {})
    const username = await findUsernameByUid(user.uid)
    if (username) await repointUsernameEmail(username, mail).catch(() => {})
  }, [user])

  /**
   * Sends a reset link to the given email. If no account uses it, that is said plainly
   * so the owner knows to try another address.
   *
   * Note: Firebase only reports a missing account (`auth/user-not-found`) when "Email
   * Enumeration Protection" is turned OFF in the console. With it on, Firebase hides
   * that, and every valid-looking address reports as sent.
   */
  const resetPassword = useCallback(async (email) => {
    const mail = (email ?? '').trim().toLowerCase()
    if (!EMAIL_RE.test(mail)) throw new Error('Enter a valid email address, like you@example.com.')
    try {
      await sendPasswordResetEmail(auth, mail)
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        throw new Error('No account is registered with this email.')
      }
      throw new Error(friendlyError(err.code))
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        checking,
        signIn,
        signUp,
        signOut,
        changePassword,
        changeEmail,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
