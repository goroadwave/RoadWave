'use client'

import { useRef, useState } from 'react'

type Props = {
  onResult: (text: string) => void
  onError?: (message: string) => void
}

// 'idle'    — initial; shows "Scan QR Code" button
// 'reading' — file picker returned, decode in progress
// 'error'   — last decode failed; user can retry
type Phase = 'idle' | 'reading' | 'error'

// File-based QR scanner. Uses a hidden <input type="file" capture="environment">
// which on phones opens the native camera UI, and on desktop opens the file
// picker. Once an image is selected we draw it into a canvas and decode with
// jsQR. This avoids getUserMedia permissions entirely, which is the only way
// QR scanning works in iOS Chrome (Apple disallows getUserMedia in 3rd-party
// browsers there) and the most reliable path on Android Chrome too.
export function QrScanner({ onResult, onError }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [errMsg, setErrMsg] = useState<string | null>(null)

  function openPicker() {
    console.log('[QR] Scan button tapped — opening file picker')
    setErrMsg(null)
    inputRef.current?.click()
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    console.log('[QR] file input change event fired', { files: e.target.files })
    const file = e.target.files?.[0]
    // Reset the input so picking the same file twice in a row still triggers
    // a change event.
    e.target.value = ''
    if (!file) {
      console.log('[QR] no file selected (user cancelled)')
      return
    }
    console.log('[QR] got file:', {
      name: file.name,
      type: file.type,
      size: file.size,
    })

    setPhase('reading')
    setErrMsg(null)

    try {
      const text = await decodeQrFromFile(file)
      console.log('[QR] jsQR result:', text)

      if (!text) {
        const msg = 'QR code not recognized — try again.'
        setErrMsg(msg)
        setPhase('error')
        onError?.(msg)
        return
      }

      // Hand the raw decoded text up to the parent. The parent owns the
      // routing decision (extractToken + router.push), and any "scanned but
      // not a RoadWave token" feedback comes back via onError.
      console.log('[QR] handing scanned text to parent:', text)
      setPhase('idle')
      onResult(text)
    } catch (err) {
      console.error('[QR] decode threw:', err)
      const msg = err instanceof Error ? err.message : 'Could not read that image.'
      setErrMsg(msg)
      setPhase('error')
      onError?.(msg)
    }
  }

  return (
    <div className="space-y-3 text-center">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="sr-only"
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={phase === 'reading'}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-4 py-3 text-sm font-semibold shadow-lg shadow-flame/15 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {phase === 'reading' ? (
          <>
            <Spinner />
            Reading QR…
          </>
        ) : (
          <>
            <span aria-hidden>📷</span>
            Scan QR Code
          </>
        )}
      </button>

      {phase === 'reading' && (
        <p className="text-xs text-flame">
          Decoding your photo — this should only take a second.
        </p>
      )}

      {phase === 'idle' && !errMsg && (
        <p className="text-xs text-mist">
          On phone: opens your camera. On desktop: pick an image.
        </p>
      )}

      {errMsg && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-left">
          <p className="text-sm font-semibold text-red-300">{errMsg}</p>
          <p className="mt-1 text-xs text-red-200/80">
            Make sure the QR is centered, well lit, and fully in frame. Or paste
            the link below.
          </p>
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-3.5 w-3.5 rounded-full border-2 border-night/30 border-t-night animate-spin"
    />
  )
}

// Decode a QR from an image File using jsQR. Paints the image at full
// natural resolution into a canvas, hands the pixel data to jsQR, and
// retries with different inversion strategies because color-cast quirks
// from phone cameras make some QRs decode under one strategy but not
// another. Returns the decoded text or null.
async function decodeQrFromFile(file: File): Promise<string | null> {
  console.log('[QR] decodeQrFromFile: reading file as data URL')
  const dataUrl = await readFileAsDataUrl(file)
  console.log('[QR] data URL ready, length:', dataUrl.length)

  console.log('[QR] loading <img>')
  const img = await loadImage(dataUrl)
  // Use the *natural* pixel dimensions, not the layout dimensions.
  // .width/.height can return zero or layout-affected values on some
  // browsers; .naturalWidth/.naturalHeight always reflect the file.
  const naturalW = img.naturalWidth || img.width
  const naturalH = img.naturalHeight || img.height
  console.log('[QR] image natural dimensions:', { w: naturalW, h: naturalH })

  // Mobile browsers cap canvas size around 4096x4096 (especially iOS
  // Safari). Clamp the long edge to 4000 to stay safe; otherwise honor
  // the full resolution — downsampling kills small QRs in big photos.
  const MAX_EDGE = 4000
  const scale = Math.min(1, MAX_EDGE / Math.max(naturalW, naturalH))
  const w = Math.max(1, Math.round(naturalW * scale))
  const h = Math.max(1, Math.round(naturalH * scale))
  console.log('[QR] canvas size after clamp:', { w, h, scale })

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    console.error('[QR] could not get 2d canvas context')
    throw new Error("Couldn't open a canvas to decode that image.")
  }
  ctx.drawImage(img, 0, 0, w, h)
  const imageData = ctx.getImageData(0, 0, w, h)
  console.log('[QR] got ImageData, pixel count:', imageData.data.length / 4)

  console.log('[QR] importing jsqr…')
  const mod = await import('jsqr')
  const jsQR = mod.default ?? (mod as unknown as typeof mod.default)
  if (typeof jsQR !== 'function') {
    console.error('[QR] jsQR import did not return a function:', mod)
    throw new Error('QR decoder failed to load.')
  }

  // Try multiple inversion strategies. jsQR mutates the input buffer
  // during decode, so each attempt needs a fresh copy of the pixel data.
  const strategies = ['attemptBoth', 'dontInvert', 'onlyInvert', 'invertFirst'] as const
  for (const inversionAttempts of strategies) {
    const dataCopy = new Uint8ClampedArray(imageData.data)
    const code = jsQR(dataCopy, w, h, { inversionAttempts })
    console.log(`[QR] jsQR(${inversionAttempts}) returned:`, code ? `"${code.data}"` : 'null')
    if (code?.data) return code.data
  }
  return null
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Couldn't read that image."))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onerror = () => reject(new Error("Couldn't decode that image."))
    img.onload = () => resolve(img)
    img.src = src
  })
}
