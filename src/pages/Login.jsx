import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { SHOP, LOGIN } from '../config/shop'
import Field, { inputClass } from '../components/Field'

export default function Login() {
  const { signIn } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signIn(username, password)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <img src="/logo.png" alt={SHOP.name} className="mx-auto h-20 w-auto object-contain" />
          <p className="mt-3 text-sm text-slate-500">Stock &amp; Billing</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
        >
          <Field label="Username">
            <input
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={LOGIN.username}
              className={inputClass}
            />
          </Field>

          <Field label="Password">
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !username.trim() || !password}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogIn size={17} />
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
          {SHOP.name} · {SHOP.owner}
        </p>
      </div>
    </div>
  )
}
