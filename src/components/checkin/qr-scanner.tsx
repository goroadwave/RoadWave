'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  onResult: (text: string) => void
  onError?: (message: string) => void
}

// 'idle'        — initial; shows "Allow Camera Access" button.
// 'starting'    — getUserMedia in flight, native permission prompt visible.
// 'scanning'    — stream is live and BarcodeDetector loop is running.
// 'denied'      — user said no to permission. Friendly fallback copy.
// 'unsupported' — browser missing getUserMedia or BarcodeDetector.
// 'error'       — anything else (no rear camera, hardware failure, etc.).
type State = 'idle' | 'starting' | 'scanning' | 'denied' | 'unsupported' | 'error'

// Minimal QR scanner. Calls navigator.mediaDevices.getUserMedia directly on
// the user's click — synchronous from the gesture's perspective — which is
// what iOS Safari needs to trigger the native permission prompt. Decoding
// uses the native BarcodeDetector API (supported on Android Chrome since
// 2020 and iOS Safari since 17). On older browsers we fall back to the
// "paste a link" form rendered alongside this component.
export function QrScanner({ onResult, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // Typed loosely because BarcodeDetector isn't in lib.dom yet. We only
  // call .detect(video) which returns Promise<{ rawValue: string }[]>.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detectorRef = useRef<any>(null)
  const rafRef = useRef<number | null>(null)
  const [state, setState] = useState<State>('idle')
  const [errMsg, setErrMsg] = useState<string | null>(null)

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
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState('unsupported')
      return
    }
    setState('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream

      const video = videoRef.current
      if (!video) {
        // Component unmounted between request + grant. Tear down the stream.
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      video.srcObject = stream
      // iOS Safari requires playsinline + muted to avoid going fullscreen
      // and to allow autoplay without a separate gesture. The JSX props
      // also set these, but setAttribute is belt-and-suspenders for the
      // serialized HTML the browser sees.
      video.setAttribute('playsinline', 'true')
      video.setAttribute('muted', 'true')
      await video.play().catch(() => {
        /* iOS sometimes throws on play(); the stream still renders */
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Detector = (window as any).BarcodeDetector
      if (!Detector) {
        setState('unsupported')
        stopCamera()
        return
      }
      detectorRef.current = new Detector({ formats: ['qr_code'] })
      setState('scanning')
      tick()
    } catch (err) {
      const e = err as DOMException | Error
      const name = (e as DOMException)?.name
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
          Tap to enable your rear camera. Point at the QR code on the
          campground sign.
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

  if (state === 'unsupported') {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-cream">
        QR scanning isn&apos;t supported in this browser. Paste your campground
        link below to check in instead.
      </p>
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
        {/* Light reticle to hint at where to point. */}
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
