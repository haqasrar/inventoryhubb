import { useState } from 'react'
import { Store, Check } from 'lucide-react'
import { useShop } from '../context/useShop'
import { useAuth } from '../context/useAuth'
import { BLANK_SHOP, DEFAULT_BILL_PREFIX } from '../config/shop'
import Field, { inputClass } from '../components/Field'
import PageHeader from '../components/PageHeader'

/**
 * The shop's own details — everything a customer sees on a printed bill.
 *
 * The same form does two jobs. A brand new account meets it as a full-screen setup
 * step before it can reach the app at all (there is no shop to keep books for until
 * it is filled in); afterwards it is the /shop page inside the normal layout. Asking
 * twice for the same eight fields would have been the only alternative.
 */
export default function ShopDetails() {
  const { shop, saveShop } = useShop()
  const { signOut } = useAuth()

  const firstRun = !shop
  const [form, setForm] = useState(() => ({ ...BLANK_SHOP, ...(shop ?? {}) }))
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
    setSaved(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await saveShop(form)
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const fields = (
    <>
      <Field label="Shop name" hint="Printed at the top of every bill.">
        <input
          type="text"
          value={form.name}
          onChange={set('name')}
          placeholder="Umer Enterprises"
          className={inputClass}
        />
      </Field>

      <Field label="Owner's name" hint="Printed as “Prop: …”.">
        <input
          type="text"
          value={form.owner}
          onChange={set('owner')}
          placeholder="Full name"
          className={inputClass}
        />
      </Field>

      <Field label="Short tagline" hint="Optional. Sits under the shop name in the app.">
        <input
          type="text"
          value={form.tagline}
          onChange={set('tagline')}
          placeholder="Electronics & Furniture"
          className={inputClass}
        />
      </Field>

      <Field label="GSTIN" hint="Optional. Leave blank if the shop is not registered.">
        <input
          type="text"
          value={form.gstin}
          onChange={set('gstin')}
          autoCapitalize="characters"
          className={inputClass}
        />
      </Field>

      <Field label="Phone">
        <input
          type="tel"
          value={form.phone}
          onChange={set('phone')}
          inputMode="tel"
          className={inputClass}
        />
      </Field>

      <Field label="Address">
        <textarea
          rows={2}
          value={form.address}
          onChange={set('address')}
          placeholder="Street, town, district, PIN"
          className={inputClass}
        />
      </Field>

      <Field
        label="Deals in"
        hint="The long line under the shop name on the bill — what the shop sells."
      >
        <textarea
          rows={3}
          value={form.dealsIn}
          onChange={set('dealsIn')}
          placeholder="Deals in all kinds of …"
          className={inputClass}
        />
      </Field>

      <Field
        label="Bill number prefix"
        hint={`Bills are numbered like UE-0001. Blank uses ${DEFAULT_BILL_PREFIX}.`}
      >
        <input
          type="text"
          value={form.billPrefix}
          onChange={set('billPrefix')}
          placeholder={DEFAULT_BILL_PREFIX}
          maxLength={6}
          className={`${inputClass} uppercase`}
        />
      </Field>

      <Field
        label="Logo image"
        hint="Optional path or link to your logo, e.g. /logo.png. Blank prints the shop name instead."
      >
        <input
          type="text"
          value={form.logo}
          onChange={set('logo')}
          placeholder="/logo.png"
          className={inputClass}
        />
      </Field>

      <Field
        label="Signature image"
        hint="Optional. Printed above the signing line on bills. Blank leaves space to sign by hand."
      >
        <input
          type="text"
          value={form.signature}
          onChange={set('signature')}
          placeholder="/signature.png"
          className={inputClass}
        />
      </Field>
    </>
  )

  const feedback = (
    <>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
      )}
      {saved && !error && (
        <p className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          <Check size={16} />
          Saved.
        </p>
      )}
    </>
  )

  const submitLabel = firstRun ? 'Open my shop' : 'Save changes'
  const button = (
    <button
      type="submit"
      disabled={busy}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Store size={17} />
      {busy ? 'Saving…' : submitLabel}
    </button>
  )

  if (firstRun) {
    return (
      <div className="flex min-h-screen items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Store size={24} />
            </span>
            <h1 className="mt-4 text-xl font-semibold">Tell us about your shop</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              This is what gets printed on your customers&apos; bills. You can change any of it
              later.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
          >
            {fields}
            {feedback}
            <div className="pt-1">{button}</div>
          </form>

          <button
            onClick={signOut}
            className="mx-auto mt-5 block text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Shop details"
        subtitle="What customers see on every bill you print."
      />
      <form
        onSubmit={handleSubmit}
        className="max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
      >
        {fields}
        {feedback}
        <div className="pt-1">{button}</div>
      </form>
    </div>
  )
}
