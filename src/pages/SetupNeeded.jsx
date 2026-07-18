import { AlertTriangle } from 'lucide-react'

/** Shown when .env.local has not been filled in yet, instead of a blank crash. */
export default function SetupNeeded() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6">
        <span className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <AlertTriangle size={22} />
        </span>
        <h1 className="mt-4 text-xl font-semibold">Firebase is not connected yet</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Copy <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">.env.example</code> to{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">.env.local</code>, paste the
          config from the Firebase console into it, then restart the dev server.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-900 px-4 py-3 text-xs leading-relaxed text-slate-100">
          {`Firebase console → Project settings (gear)
  → Your apps → Web app
  → SDK setup and configuration → Config`}
        </pre>
      </div>
    </div>
  )
}
