import { useEffect, useRef, useState } from 'react'
import { X, Keyboard, CameraOff } from 'lucide-react'
import { inputClass } from './Field'

/** Formats worth scanning in a shop — retail barcodes plus QR, no exotic ones. */
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code']

/** Ignore the same code re-read within this window, so one item is not scanned ten times. */
const DEDUPE_MS = 1500

/**
 * Camera barcode scanner shown as a full-screen overlay.
 *
 * Uses the browser's native BarcodeDetector when present — instant and free on the
 * Android phones this shop uses — and lazy-loads ZXing only when it is not, so the
 * main app download stays small. A manual-entry box is always there as a fallback,
 * so a scratched label or an unsupported browser is never a dead end.
 *
 * `onScan(code)` fires for each read. In `continuous` mode the camera stays on for
 * scanning item after item (the till); otherwise it stops after the first hit.
 */
export default function BarcodeScanner({ title = 'Scan barcode', continuous = false, onScan, onClose }) {
  const videoRef = useRef(null)
  const [status, setStatus] = useState('starting') // starting | scanning | error
  const [error, setError] = useState('')
  const [manual, setManual] = useState('')

  // Kept in refs so the async camera loop always sees the latest without re-subscribing.
  const lastRef = useRef({ code: '', at: 0 })
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    let stream = null
    let rafId = null
    let zxingControls = null
    let cancelled = false

    /** Pass a read up, unless it repeats the previous one too soon. */
    function handle(code) {
      const value = String(code || '').trim()
      if (!value) return
      const now = Date.now()
      if (value === lastRef.current.code && now - lastRef.current.at < DEDUPE_MS) return
      lastRef.current = { code: value, at: now }
      onScanRef.current(value)
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        if (cancelled) return

        const video = videoRef.current
        video.srcObject = stream
        video.setAttribute('playsinline', 'true') // iOS: play inline, not full-screen
        await video.play()
        setStatus('scanning')

        if ('BarcodeDetector' in window) {
          const supported = await window.BarcodeDetector.getSupportedFormats()
          const detector = new window.BarcodeDetector({
            formats: FORMATS.filter((f) => supported.includes(f)),
          })

          const tick = async () => {
            if (cancelled) return
            try {
              const found = await detector.detect(video)
              if (found.length) handle(found[0].rawValue)
            } catch {
              /* a dropped frame is not fatal; keep going */
            }
            rafId = requestAnimationFrame(tick)
          }
          rafId = requestAnimationFrame(tick)
        } else {
          // Fallback: iOS Safari and some desktops lack BarcodeDetector.
          const { BrowserMultiFormatReader } = await import('@zxing/browser')
          if (cancelled) return
          const reader = new BrowserMultiFormatReader()
          zxingControls = await reader.decodeFromVideoElement(video, (result) => {
            if (result) handle(result.getText())
          })
        }
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setError(
          err?.name === 'NotAllowedError'
            ? 'Camera permission was blocked. Allow the camera, or type the number below.'
            : err?.name === 'NotFoundError'
              ? 'No camera found on this device. Type the number below instead.'
              : 'Could not start the camera. Type the number below instead.',
        )
      }
    }

    start()

    return () => {
      cancelled = true
      if (rafId) cancelAnimationFrame(rafId)
      try {
        zxingControls?.stop()
      } catch {
        /* already stopped */
      }
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function submitManual(e) {
    e.preventDefault()
    const code = manual.trim()
    if (!code) return
    onScan(code)
    setManual('')
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <p className="font-medium">{title}</p>
        <button
          onClick={onClose}
          aria-label="Close scanner"
          className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />

        {status === 'scanning' && (
          // A framing window so the user knows where to aim.
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-40 w-72 max-w-[80vw] rounded-xl border-2 border-white/80 shadow-[0_0_0_100vmax_rgba(0,0,0,0.45)]" />
          </div>
        )}

        {status === 'starting' && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
            Starting camera…
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
            <CameraOff size={32} className="text-white/70" />
            <p className="max-w-xs text-sm text-white/80">{error}</p>
          </div>
        )}
      </div>

      <div className="bg-white px-4 py-4">
        {status === 'scanning' && (
          <p className="mb-3 text-center text-sm text-slate-500">
            {continuous
              ? 'Point the camera at each barcode, one after another.'
              : 'Point the camera at the barcode.'}
          </p>
        )}

        <form onSubmit={submitManual}>
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <Keyboard size={15} />
            Or type the barcode number
          </p>
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="e.g. 8901234567890"
              className={inputClass}
            />
            <button
              type="submit"
              disabled={!manual.trim()}
              className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              Use
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
