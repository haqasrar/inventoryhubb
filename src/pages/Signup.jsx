import { useState } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { USERNAME_RULES } from '../config/shop'
import Field, { inputClass } from '../components/Field'
import AppCredit from '../components/AppCredit'

/**
 * Opens an account for a new shop. Only the login is created here — the shop's own
 * details are asked for straight afterwards, on the setup screen.
 */
export default function Signup() {
  const { signUp } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirm) return setError('The two passwords do not match.')

    setBusy(true)
    try {
      // The email is the account's real identity — it is what a forgotten password is
      // reset through. On success Firebase signs the new account straight in, and the
      // app moves on to the shop setup screen on its own.
      await signUp(username, email, password)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <img
            src="/app-logo.png"
            alt="InventoryHub"
            className="mx-auto mb-5 h-10 w-auto max-w-full object-contain"
          />
          <h1 className="text-xl font-semibold">Create your shop account</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your own stock, bills and history — separate from every other shop.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
        >
          <Field label="Username" hint={USERNAME_RULES.hint}>
            <input
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              autoComplete="username"
              value={username}
              // Lowercased as it is typed, so what the owner sees is exactly what
              // they will have to type again to sign in.
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="myshop"
              className={inputClass}
            />
          </Field>

          <Field
            label="Email"
            hint="Where a password reset link is sent if you're ever locked out. One email, one shop."
          >
            <input
              type="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.toLowerCase())}
              placeholder="you@example.com"
              className={inputClass}
            />
          </Field>

          <Field
            label="Password"
            hint="At least 6 characters. Write it down somewhere safe — it cannot be recovered."
          >
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </Field>

          <Field label="Confirm password">
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </Field>

          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
            Forget your password and you can reset it yourself — we email a link to the
            address above. Keep your username handy for signing in day to day.
          </p>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !username.trim() || !email.trim() || !password || !confirm}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserPlus size={17} />
            {busy ? 'Creating your account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </p>

        <AppCredit className="mt-8" />
      </div>
    </div>
  )
}
