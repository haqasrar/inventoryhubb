import { useCallback, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  setPersistence,
  browserLocalPersistence,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth'
import { auth } from '../services/firebase'
import { AuthContext } from './useAuth'
import { LEGACY_LOGIN, USERNAME_DOMAIN, USERNAME_RULES } from '../config/shop'

/** Firebase's own error codes are not something a shopkeeper should have to read. */
function friendlyError(code) {
  switch (code) {
    case 'auth/invalid-email':
      return `That username cannot be used. ${USERNAME_RULES.hint}`
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
    case 'auth/email-already-in-use':
      return 'That username is already taken. Try another one.'
    case 'auth/operation-not-allowed':
      return 'New accounts are switched off in the Firebase console.'
    default:
      return 'Could not complete the action. Please try again.'
  }
}

/**
 * Turns the username that was typed into the address Firebase expects. Nobody in the
 * shop ever sees the result — it exists only because Firebase Auth has no concept of
 * a username.
 *
 * Lowercased first, so signing in with `Hajin` reaches the account created as
 * `hajin` instead of failing with "wrong username or password".
 */
function resolveEmail(typed) {
  const username = (typed ?? '').trim().toLowerCase()
  if (!username) throw new Error('Enter your username.')

  // The one account created by hand, against a real address, before signups existed.
  if (username === LEGACY_LOGIN.username.toLowerCase() && LEGACY_LOGIN.email) {
    return LEGACY_LOGIN.email
  }
  return `${username}@${USERNAME_DOMAIN}`
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

  /**
   * Opens a new shop's account. Only the login is created here — the shop's own
   * details are asked for on the next screen, once there is a uid to file them under.
   *
   * Nothing checks whether the username is free beforehand: Firebase refuses a second
   * account on the same address, so the create itself is the uniqueness check, and it
   * cannot be lost to two people signing up at the same moment.
   */
  const signUp = useCallback(async (username, password) => {
    const name = (username ?? '').trim().toLowerCase()

    if (!USERNAME_RULES.pattern.test(name)) {
      throw new Error(`That username cannot be used. ${USERNAME_RULES.hint}`)
    }
    if (name === LEGACY_LOGIN.username.toLowerCase()) {
      throw new Error('That username is already taken. Try another one.')
    }
    if (password.length < 6) throw new Error('Password must be at least 6 characters.')

    try {
      await createUserWithEmailAndPassword(auth, `${name}@${USERNAME_DOMAIN}`, password)
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

  return (
    <AuthContext.Provider value={{ user, checking, signIn, signUp, signOut, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}
