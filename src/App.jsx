import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isConfigured } from './services/firebase'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import { ShopProvider } from './context/ShopContext'
import { useShop } from './context/useShop'
import { InventoryProvider } from './context/InventoryContext'
import { useInventory } from './context/useInventory'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Sell from './pages/Sell'
import Restock from './pages/Restock'
import History from './pages/History'
import ShopDetails from './pages/ShopDetails'
import Login from './pages/Login'
import Signup from './pages/Signup'
import SetupNeeded from './pages/SetupNeeded'

function Splash({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-center">
      <p className="text-sm text-slate-500">{children}</p>
    </div>
  )
}

function Shop() {
  const { loading, loadError } = useInventory()

  if (loadError) return <Splash>{loadError}</Splash>
  if (loading) return <Splash>Loading your shop…</Splash>

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="sell" element={<Sell />} />
        <Route path="restock" element={<Restock />} />
        <Route path="history" element={<History />} />
        <Route path="shop" element={<ShopDetails />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

/**
 * A signed-in account with no shop document is a brand new owner who has not filled
 * in their details yet. There is nothing to keep books for until they do, so the
 * setup form stands in front of the whole app rather than being a page inside it.
 */
function ShopGate() {
  const { shop, loading, loadError } = useShop()

  if (loading) return <Splash>Loading your shop…</Splash>
  if (loadError) return <Splash>{loadError}</Splash>
  if (!shop) return <ShopDetails />

  return (
    <InventoryProvider>
      <Shop />
    </InventoryProvider>
  )
}

function SignedOut() {
  return (
    <Routes>
      <Route path="/signup" element={<Signup />} />
      <Route path="*" element={<Login />} />
    </Routes>
  )
}

function Gate() {
  const { user, checking } = useAuth()

  if (checking) return <Splash>Checking your login…</Splash>
  if (!user) return <SignedOut />

  return (
    <ShopProvider>
      <ShopGate />
    </ShopProvider>
  )
}

export default function App() {
  if (!isConfigured) return <SetupNeeded />

  return (
    <AuthProvider>
      <BrowserRouter>
        <Gate />
      </BrowserRouter>
    </AuthProvider>
  )
}
