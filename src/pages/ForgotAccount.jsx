import { useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, Check } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import Field, { inputClass } from '../components/Field'
import AppCredit from '../components/AppCredit'

/**
 * Password reset by email. The owner types the address on their account; if an account
 * uses it, Firebase emails a link that opens its own secure page to set a new password.
 * If no account uses the address, they are told so plainly (see `resetPassword` for the
 * console setting this depends on).
 */
export default function ForgotAccount() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <KeyRound size={24} />
          </span>
          <h1 className="mt-4 text-xl font-semibold">Reset your password</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Enter the email on your account and we&apos;ll send a link to set a new
            password.
          </p>
        </div>

        {sent ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check size={22} />
            </span>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              A reset link has been sent to{' '}
              <span className="font-medium text-slate-800">{email.trim()}</span>. Open it
              and choose a new password.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              No email after a few minutes? Check your spam folder, or that you typed the
              same address you signed up with.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
          >
            <Field label="Email">
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

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <KeyRound size={17} />
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-slate-500">
          Remembered it?{' '}
          <Link to="/" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Back to sign in
          </Link>
        </p>

        <AppCredit className="mt-8" />
      </div>
    </div>
  )
}
