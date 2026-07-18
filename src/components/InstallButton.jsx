import { useState } from 'react'
import { Download, Share, MoreVertical, ExternalLink } from 'lucide-react'
import useInstallPrompt, { isIOS, isInAppBrowser } from '../hooks/useInstallPrompt'
import Modal from './Modal'

function Step({ n, icon: Icon, children }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
        {n}
      </span>
      <span className="flex-1 text-sm leading-relaxed text-slate-600">
        {children}
        {Icon && <Icon size={15} className="mx-1 inline-block align-text-bottom text-slate-500" />}
      </span>
    </li>
  )
}

/**
 * Chrome on Android can open its own install dialog. Everywhere else — iPhones, and
 * the in-app browsers WhatsApp and Facebook use — there is no such API, so the button
 * falls back to showing what to tap instead.
 */
export default function InstallButton({ className = '' }) {
  const { installed, canPrompt, install } = useInstallPrompt()
  const [showHelp, setShowHelp] = useState(false)

  if (installed) return null

  async function handleClick() {
    if (canPrompt && (await install())) return
    setShowHelp(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 ${className}`}
      >
        <Download size={17} />
        Install app
      </button>

      {showHelp && (
        <Modal title="Install on your phone" onClose={() => setShowHelp(false)}>
          {isInAppBrowser() ? (
            <>
              <p className="text-sm leading-relaxed text-slate-600">
                This page is open inside WhatsApp&apos;s own browser, which cannot install apps.
                Open it in Chrome or Safari first.
              </p>
              <ol className="mt-4 space-y-3">
                <Step n="1" icon={MoreVertical}>
                  Tap the menu button at the top of this screen
                </Step>
                <Step n="2" icon={ExternalLink}>
                  Choose <b>Open in browser</b> or <b>Open in Chrome</b>
                </Step>
                <Step n="3">
                  Press <b>Install app</b> again on that page
                </Step>
              </ol>
            </>
          ) : isIOS() ? (
            <>
              <p className="text-sm leading-relaxed text-slate-600">
                On iPhone, Safari adds the app from the Share menu.
              </p>
              <ol className="mt-4 space-y-3">
                <Step n="1" icon={Share}>
                  Tap the Share button at the bottom of Safari
                </Step>
                <Step n="2">
                  Scroll down and tap <b>Add to Home Screen</b>
                </Step>
                <Step n="3">
                  Tap <b>Add</b>. The shop icon appears on your home screen
                </Step>
              </ol>
            </>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-slate-600">
                Your browser has not offered the install button yet. It usually appears in the
                browser menu.
              </p>
              <ol className="mt-4 space-y-3">
                <Step n="1" icon={MoreVertical}>
                  Open the browser menu
                </Step>
                <Step n="2">
                  Tap <b>Install app</b> or <b>Add to Home screen</b>
                </Step>
                <Step n="3">
                  If neither appears, make sure you are using Chrome and reload this page
                </Step>
              </ol>
            </>
          )}

          <button
            onClick={() => setShowHelp(false)}
            className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            Got it
          </button>
        </Modal>
      )}
    </>
  )
}
