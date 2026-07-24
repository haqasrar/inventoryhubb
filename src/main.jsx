import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

/**
 * Keep the installed app up to date on its own.
 *
 * In autoUpdate mode a new service worker takes over and reloads the page by itself —
 * but only once it has been *looked for*. Left to the browser, that check happens only
 * on a fresh page load, which an installed home-screen app rarely does. So we ask for
 * it explicitly: right away, whenever the app is brought back to the foreground, and
 * every half hour while it stays open. That is what makes a push reach the phone
 * without opening it in a browser first.
 */
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    const check = () => registration.update().catch(() => {})
    setInterval(check, 30 * 60 * 1000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check()
    })
    window.addEventListener('online', check)
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
