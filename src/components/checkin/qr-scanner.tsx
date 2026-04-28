'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  onResult: (text: string) => void
  onError?: (message: string) => void
}

// 'idle'        — initial; shows the "Allow Camera Access" button
// 'starting'    — getUserMedia in flight, native permission prompt visible
// 'scanning'    — stream is live, BarcodeDetector loop running
// 'denied'      — user said no to permission
// 'unsupported' — browser missing getUserMedia or BarcodeDetector
// 'error'       — anything else (no rear camera, hardware failure, etc.)
type State = 'idle' | 'starting' | 'scanning' | 'denied' | 'unsupported' | 'error'

// Live camera + native QR detection. Calls navigator.mediaDevices.getUserMedia
// directly on the user's tap (synchronous from the gesture's perspective —
// what iOS Safari 17+ requires to show its permission prompt). Decoding uses
// the native BarcodeDetector API. If either is missing — most commonly iOS
// Chrome/Firefox where Apple disallows getUserMedia in third-party browsers —
// we fall back to a clear message pointing the user at the paste-a-link form.
export function QrScanner({ onResult, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // BarcodeDetector isn't in lib.dom.d.ts yet. Loose typing is fine — we only
  // use .detect(video) which returns Promise<{ rawValue: string }[]>.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detectorRef = useRef<any>(null)
  const rafRef = useRef<number | null>(null)
  const [state, setState] = useState<State>('idle')
  const [errMsg, setErrMsg] = useState<string | null>(null)

  // Detect feature support on mount. Drives the initial UI: if we already
  // know the browser can't do it, we show the paste-link fallback instead
  // of an "Allow Camera Access" button that would just fail.
  const [supported, setSupported] = useState<boolean | null>(null)
  useEffect(() => {
    const hasGetUserMedia =
      typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasDetector = typeof (window as any).BarcodeDetector === 'function'
    console.log('[QR] feature check:', { hasGetUserMedia, hasDetector })
    setSupported(hasGetUserMedia && hasDetector)
  }, [])

  function stopCamera() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  useEffect(() => () => stopCamera(), [])

  async function startCamera() {
    setErrMsg(null)
    setState('starting')
    console.log('[QR] requesting camera (facingMode: environment)')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream

      const video = videoRef.current
      if (!video) {
        // Component unmounted between request and grant. Tear down.
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      video.srcObject = stream
      // iOS Safari needs both. JSX props set these too; setAttribute is
      // belt-and-suspenders against serialization quirks.
      video.setAttribute('playsinline', 'true')
      video.setAttribute('muted', 'true')
      await video.play().catch(() => {
        /* iOS sometimes throws on play(); the stream still renders */
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Detector = (window as any).BarcodeDetector
      detectorRef.current = new Detector({ formats: ['qr_code'] })
      setState('scanning')
      console.log('[QR] camera live, scanning loop started')
      tick()
    } catch (err) {
      const e = err as DOMException | Error
      const name = (e as DOMException)?.name
      console.error('[QR] startCamera failed:', name, err)
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
        onError?.(msg)
      }
    }
  }

  async function tick() {
    const video = videoRef.current
    const detector = detectorRef.current
    if (!video || !detector) return
    try {
      const codes = await detector.detect(video)
      if (codes && codes.length > 0) {
        const text: string = codes[0].rawValue
        if (text) {
          console.log('[QR] BarcodeDetector hit:', text)
          stopCamera()
          onResult(text)
          return
        }
      }
    } catch {
      // BarcodeDetector occasionally throws on partial frames — keep going.
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  // Wait until feature detection has run before rendering. A single frame
  // of "Allow Camera Access" on a browser that can't actually start one
  // would be a worse experience than a blank flash.
  if (supported === null) return null

  if (!supported) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-cream">
        Live QR scanning isn&apos;t supported in this browser. Use the
        paste-a-link option below to check in.
      </div>
    )
  }

  if (state === 'idle') {
    return (
      <div className="space-y-3 text-center">
        <button
          type="button"
          onClick={startCamera}
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
    )
  }

  if (state === 'denied') {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-cream space-y-2">
        <p>
          Camera access was denied. You can still check in by pasting your
          campground link below.
        </p>
        <button
          type="button"
          onClick={startCamera}
          className="text-xs font-semibold text-flame underline-offset-2 hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="space-y-2">
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {errMsg ?? 'Could not start camera.'}
        </p>
        <button
          type="button"
          onClick={startCamera}
          className="text-xs font-semibold text-flame underline-offset-2 hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  // starting | scanning
  return (
    <div className="space-y-2">
      <div className="relative mx-auto w-full max-w-sm aspect-square rounded-lg overflow-hidden border border-white/10 bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Light reticle hint for where to point. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-6 rounded-lg border-2 border-flame/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
        />
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <p className="text-mist">
          {state === 'starting'
            ? 'Starting camera…'
            : 'Point at the QR code on the campground sign.'}
        </p>
        <button
          type="button"
          onClick={() => {
            stopCamera()
            setState('idle')
          }}
          className="text-mist hover:text-cream underline-offset-2 hover:underline"
        >
          Stop
        </button>
      </div>
    </div>
  )
}
