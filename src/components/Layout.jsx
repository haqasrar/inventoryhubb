import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  PackagePlus,
  History as HistoryIcon,
  LogOut,
  Key,
  Mail,
  Store,
} from 'lucide-react'
import { useState } from 'react'
import Toast from './Toast'
import ShopFooter from './ShopFooter'
import InstallButton from './InstallButton'
import { useAuth } from '../context/useAuth'
import { useShop } from '../context/useShop'
import Modal from './Modal'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/sell', label: 'Sell', icon: ShoppingCart },
  { to: '/restock', label: 'Restock', icon: PackagePlus },
  { to: '/history', label: 'History', icon: HistoryIcon },
]

export default function Layout() {
  const { user, signOut, changePassword, changeEmail } = useAuth()
  const { shop } = useShop()
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [cpError, setCpError] = useState('')
  const [cpBusy, setCpBusy] = useState(false)
  const [showChangeEmail, setShowChangeEmail] = useState(false)
  const [ceError, setCeError] = useState('')
  const [ceBusy, setCeBusy] = useState(false)

  async function handleChangePassword(e) {
    e.preventDefault()
    setCpError('')
    const form = e.target
    const current = form.currentPassword.value
    const newPass = form.newPassword.value
    const confirm = form.confirmPassword.value

    if (newPass !== confirm) return setCpError('New passwords do not match.')
    if (newPass.length < 6) return setCpError('Password must be at least 6 characters.')

    setCpBusy(true)
    try {
      await changePassword(current, newPass)
      setShowChangePassword(false)
      form.reset()
    } catch (err) {
      setCpError(err.message)
    } finally {
      setCpBusy(false)
    }
  }

  async function handleChangeEmail(e) {
    e.preventDefault()
    setCeError('')
    const form = e.target
    const current = form.currentPassword.value
    const newEmail = form.newEmail.value

    setCeBusy(true)
    try {
      await changeEmail(current, newEmail)
      setShowChangeEmail(false)
      form.reset()
    } catch (err) {
      setCeError(err.message)
    } finally {
      setCeBusy(false)
    }
  }

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-3 px-5 py-6">
          {/* The shop's own logo if it has uploaded one, otherwise the app's mark. */}
          <img
            src={shop.logo || '/app-mark.png'}
            alt=""
            className="size-11 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">{shop.name}</p>
            {shop.tagline && <p className="text-xs text-slate-500">{shop.tagline}</p>}
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 px-3 py-3 space-y-2">
          <InstallButton className="w-full" />
          <NavLink
            to="/shop"
            className={({ isActive }) =>
              `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <Store size={18} />
            Shop details
          </NavLink>
          <button
            onClick={() => setShowChangeEmail(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Mail size={18} />
            Change email
          </button>
          <button
            onClick={() => setShowChangePassword(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Key size={18} />
            Change password
          </button>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <img src={shop.logo || '/app-mark.png'} alt="" className="size-9 shrink-0 object-contain" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{shop.name}</p>
          {shop.tagline && <p className="text-[11px] text-slate-500">{shop.tagline}</p>}
        </div>
        {/* The bottom bar is full, so shop details lives up here on phones. */}
        <NavLink
          to="/shop"
          aria-label="Shop details"
          className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <Store size={18} />
        </NavLink>
        <button
          onClick={signOut}
          aria-label="Sign out"
          className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <LogOut size={18} />
        </button>
      </header>

      <main className="flex-1 pb-24 lg:pb-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
          <Outlet />
          <ShopFooter />
        </div>
      </main>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white lg:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${
                isActive ? 'text-indigo-600' : 'text-slate-500'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>

      <Toast />

      {showChangePassword && (
        <Modal title="Change password" onClose={() => { setShowChangePassword(false); setCpError(''); }}>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Current password</label>
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New password</label>
              <input
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm new password</label>
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            {cpError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{cpError}</p>
            )}
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => { setShowChangePassword(false); setCpError(''); }}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={cpBusy}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {cpBusy ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showChangeEmail && (
        <Modal title="Change email" onClose={() => { setShowChangeEmail(false); setCeError(''); }}>
          <form onSubmit={handleChangeEmail} className="space-y-4">
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
              This is the address a password reset is sent to. Your username for signing
              in does not change.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New email</label>
              <input
                name="newEmail"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                required
                defaultValue=""
                placeholder={user?.email || 'you@example.com'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Current password</label>
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            {ceError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{ceError}</p>
            )}
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => { setShowChangeEmail(false); setCeError(''); }}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={ceBusy}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {ceBusy ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}