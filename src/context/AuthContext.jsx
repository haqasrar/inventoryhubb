import { useCallback, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  setPersistence,
  browserLocalPersistence,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth } from '../services/firebase'
import { AuthContext } from './useAuth'
import { LOGIN } from '../config/shop'

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
      return 'Please sign in again before changing your password.'
    default:
      return 'Could not complete the action. Please try again.'
  }
}

/**
 * Turns what was typed into the address Firebase expects. An email is passed straight
 * through, so the account can always be reached even if LOGIN.username changes.
 */
function resolveEmail(typed) {
  const value = (typed ?? '').trim()
  if (value.includes('@')) return value

  if (!LOGIN.email) {
    throw new Error(
      'Login is not finished: add the account email to LOGIN.email in src/config/shop.js.',
    )
  }
  if (value.toLowerCase() !== LOGIN.username.toLowerCase()) {
    throw new Error('Wrong username or password.')
  }
  return LOGIN.email
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
    // resolveEmail throws its own already-readable messages, which have no Firebase
    // error code — those must not be flattened into the generic fallback.
    const email = resolveEmail(username)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      throw new Error(err.code ? friendlyError(err.code) : err.message)
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

  /** Accepts the username too, so the reset screen can ask for the same thing as sign-in. */
  const sendResetEmail = useCallback(async (usernameOrEmail) => {
    const email = resolveEmail(usernameOrEmail)
    try {
      await sendPasswordResetEmail(auth, email)
      return email
    } catch (err) {
      throw new Error(err.code ? friendlyError(err.code) : err.message)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, checking, signIn, signOut, changePassword, sendResetEmail }}>
      {children}
    </AuthContext.Provider>
  )
}
