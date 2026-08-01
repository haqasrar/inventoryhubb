import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import Field, { inputClass } from '../components/Field'
import InstallButton from '../components/InstallButton'
import AppCredit from '../components/AppCredit'

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
          <img
            src="/app-logo.png"
            alt="InventoryHub"
            className="mx-auto h-12 w-auto max-w-full object-contain"
          />
          <p className="mt-3 text-sm text-slate-500">Sign in to your shop</p>
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
              placeholder="myshop"
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

          <div className="text-right">
            <Link
              to="/forgot"
              className="text-xs font-medium text-slate-400 hover:text-slate-600"
            >
              Forgot your password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={busy || !username.trim() || !password}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogIn size={17} />
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          New shop?{' '}
          <Link to="/signup" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Create an account
          </Link>
        </p>

        <div className="mt-5 flex justify-center">
          <InstallButton />
        </div>

        <AppCredit className="mt-8" />
      </div>
    </div>
  )
}
