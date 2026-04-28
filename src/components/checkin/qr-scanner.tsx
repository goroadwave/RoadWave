'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  onResult: (text: string) => void
  onError?: (message: string) => void
}

// 'idle'     — initial; shows the "Allow Camera Access" button
// 'starting' — library is requesting camera; native permission prompt visible
// 'scanning' — stream is live, library's decoder loop is running
// 'denied'   — user denied permission
// 'error'    — anything else (no rear camera, hardware failure, etc.)
type State = 'idle' | 'starting' | 'scanning' | 'denied' | 'error'

// The library renders its <video> element into a target div by id. The id is
// stable across mounts because there is only one scanner on the page.
const READER_ID = 'roadwave-qr-reader'

// Live camera QR scanner using html5-qrcode. Works on iOS Safari (where
// BarcodeDetector isn't available) by handling getUserMedia + decoding
// internally. We use the lower-level Html5Qrcode class so we control the
// surrounding UI; Html5QrcodeScanner would inject its own buttons and file
// fallback.
export function QrScanner({ onResult, onError }: Props) {
  // Ref to the live Html5Qrcode instance. Loosely typed — the library has
  // .d.ts but typing the dynamic import path adds noise for one method we
  // actually call (.start, .stop, .clear).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null)

  // Keep the latest onResult/onError in refs so the library's success
  // callback (captured at start()) always calls the current handler, even
  // if the parent re-renders between mount and decode.
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  const [state, setState] = useState<State>('idle')
  const [errMsg, setErrMsg] = useState<string | null>(null)

  function stopScanner() {
    const inst = scannerRef.current
    if (!inst) return
    scannerRef.current = null
    // .stop() throws if not running. We don't care — we want both stop
    // and clear to fire and any errors silently swallowed.
    Promise.resolve()
      .then(() => inst.stop?.())
      .catch(() => {
        /* swallow */
      })
      .finally(() => {
        try {
          inst.clear?.()
        } catch {
          /* swallow */
        }
      })
  }

  // Cleanup on unmount.
  useEffect(() => () => stopScanner(), [])

  async function startScanner() {
    setErrMsg(null)
    setState('starting')
    console.log('[QR] importing html5-qrcode')
    try {
      const mod = await import('html5-qrcode')
      const { Html5Qrcode } = mod
      console.log('[QR] instantiating Html5Qrcode for', READER_ID)
      const inst = new Html5Qrcode(READER_ID, /* verbose */ false)
      scannerRef.current = inst

      console.log('[QR] starting camera (facingMode: environment)')
      await inst.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded: string) => {
          console.log('[QR] html5-qrcode hit:', decoded)
          stopScanner()
          onResultRef.current(decoded)
        },
        () => {
          // The library calls this on every frame that fails to decode.
          // We deliberately ignore — it's noisy and not actionable.
        },
      )
      setState('scanning')
      console.log('[QR] camera live, scanning loop running')
    } catch (err) {
      const e = err as DOMException | Error
      const name = (e as DOMException)?.name
      console.error('[QR] startScanner failed:', name, err)

      // Tear down whatever may have been left half-initialized.
      try {
        await scannerRef.current?.stop?.()
      } catch {
        /* swallow */
      }
      try {
        scannerRef.current?.clear?.()
      } catch {
        /* swallow */
      }
      scannerRef.current = null

      if (
        name === 'NotAllowedError' ||
        name === 'PermissionDeniedError' ||
        name === 'SecurityError'
      ) {
        setState('denied')
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setErrMsg("Couldn't find a rear-facing camera on this device.")
        setState('error')
      } else {
        const msg = e instanceof Error ? e.message : 'Could not start camera.'
        setErrMsg(msg)
        setState('error')
        onErrorRef.current?.(msg)
      }
    }
  }

  function handleStop() {
    stopScanner()
    setState('idle')
  }

  const showVideo = state === 'starting' || state === 'scanning'

  return (
    <div className="space-y-2">
      {/* The library renders its <video> inside this div. We always keep it
          in the tree (just collapsed via Tailwind hidden) so the element
          exists at the moment .start(READER_ID, ...) runs. */}
      <div
        className={
          showVideo
            ? 'mx-auto w-full max-w-sm overflow-hidden rounded-lg border border-white/10 bg-black'
            : 'hidden'
        }
      >
        <div id={READER_ID} className="w-full" />
      </div>

      {state === 'idle' && (
        <div className="space-y-3 text-center">
          <button
            type="button"
            onClick={startScanner}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-4 py-3 text-sm font-semibold shadow-lg shadow-flame/15 hover:bg-amber-400 transition-colors"
          >
            <span aria-hidden>📷</span>
            Allow Camera Access
          </button>
          <p className="text-xs text-mist">
            Tap to turn on your rear camera. Point at the QR on the campground
            sign — it scans automatically.
          </p>
        </div>
      )}

      {state === 'starting' && (
        <p className="text-center text-xs text-mist">Starting camera…</p>
      )}

      {state === 'scanning' && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <p className="text-mist">
            Point at the QR code on the campground sign.
          </p>
          <button
            type="button"
            onClick={handleStop}
            className="text-mist hover:text-cream underline-offset-2 hover:underline"
          >
            Stop
          </button>
        </div>
      )}

      {state === 'denied' && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-cream space-y-2">
          <p>
            Camera access was denied. You can still check in by pasting your
            campground link below.
          </p>
          <button
            type="button"
            onClick={startScanner}
            className="text-xs font-semibold text-flame underline-offset-2 hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {state === 'error' && (
        <div className="space-y-2">
          <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {errMsg ?? 'Could not start camera.'}
          </p>
          <button
            type="button"
            onClick={startScanner}
            className="text-xs font-semibold text-flame underline-offset-2 hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
