import { useEffect, useState } from 'react'

const ua = () => navigator.userAgent || ''

export const isIOS = () => /iphone|ipad|ipod/i.test(ua()) && !/windows/i.test(ua())

/**
 * WhatsApp, Facebook and Instagram open links in their own cut-down browser, which
 * cannot install anything and never fires beforeinstallprompt. Users arriving from a
 * shared link land here, so they need telling to reopen in a real browser.
 */
export const isInAppBrowser = () =>
  /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|MicroMessenger/i.test(ua())

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  window.navigator.standalone === true

/**
 * Chrome fires `beforeinstallprompt` once, and it can only be replayed from a user
 * gesture — so the event is captured and kept until the button is pressed.
 */
export default function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setDeferred(e)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  /** Returns true when the browser's own install dialog was accepted. */
  async function install() {
    if (!deferred) return false
    deferred.prompt()
    const { outcome } = await deferred.userChoice
    setDeferred(null)
    return outcome === 'accepted'
  }

  return {
    /** Hide the button entirely once it is running as an installed app. */
    installed,
    /** True when the browser can show its own install dialog. */
    canPrompt: Boolean(deferred),
    install,
  }
}
