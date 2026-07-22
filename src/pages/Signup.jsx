import { useState } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { USERNAME_RULES } from '../config/shop'
import Field, { inputClass } from '../components/Field'

/**
 * Opens an account for a new shop. Only the login is created here — the shop's own
 * details are asked for straight afterwards, on the setup screen.
 */
export default function Signup() {
  const { signUp } = useAuth()
  const [username, setUsername] = useState('')
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
      // On success Firebase signs the new account straight in, and the app moves on
      // to the shop setup screen on its own.
      await signUp(username, password)
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

          {/* Said plainly and once, on the only screen where it can still be acted
              on. There is no email address on the account, so there is nowhere to
              send a reset link. */}
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
            Keep your username and password safe. There is no way to recover a
            forgotten password by yourself — only whoever runs this app can set a new one for you.
          </p>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !username.trim() || !password || !confirm}
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
      </div>
    </div>
  )
}
