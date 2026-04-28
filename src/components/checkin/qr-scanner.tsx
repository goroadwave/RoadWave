'use client'

import { useRef, useState } from 'react'

type Props = {
  onResult: (text: string) => void
  onError?: (message: string) => void
}

// File-based QR scanner. Uses a hidden <input type="file" capture="environment">
// which on phones opens the native camera UI, and on desktop opens the file
// picker. Once an image is selected we draw it into a canvas and decode with
// jsQR. This avoids getUserMedia permissions entirely, which is the only way
// QR scanning works in iOS Chrome (Apple disallows getUserMedia in 3rd-party
// browsers there) and the most reliable path on Android Chrome too.
export function QrScanner({ onResult, onError }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  function openPicker() {
    setErrMsg(null)
    inputRef.current?.click()
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset the input so picking the same file twice in a row still triggers
    // a change event.
    e.target.value = ''
    if (!file) return

    setBusy(true)
    setErrMsg(null)
    try {
      const text = await decodeQrFromFile(file)
      if (!text) {
        const msg = "Couldn't read a QR code in that image. Try again with the QR centered and well lit."
        setErrMsg(msg)
        onError?.(msg)
        return
      }
      onResult(text)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not read that image.'
      setErrMsg(msg)
      onError?.(msg)
    } finally {
      setBusy(false)
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
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-4 py-3 text-sm font-semibold shadow-lg shadow-flame/15 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <span aria-hidden>📷</span>
        {busy ? 'Reading QR…' : 'Scan QR Code'}
      </button>
      <p className="text-xs text-mist">
        On phone: opens your camera. On desktop: pick an image.
      </p>
      {errMsg && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
          {errMsg}
        </p>
      )}
    </div>
  )
}

// Decode a QR from an image File using jsQR. Loads the image, paints it
// to an offscreen canvas, hands the pixel data to jsQR, returns the
// decoded text or null. Throws if the image itself is unreadable.
async function decodeQrFromFile(file: File): Promise<string | null> {
  const dataUrl = await readFileAsDataUrl(file)
  const img = await loadImage(dataUrl)

  // Scale very large images down a bit — jsQR runs in O(pixels) and
  // phone photos are huge. ~1280px on the long edge keeps fidelity.
  const MAX = 1280
  const scale = Math.min(1, MAX / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error("Couldn't open a canvas to decode that image.")
  ctx.drawImage(img, 0, 0, w, h)
  const imageData = ctx.getImageData(0, 0, w, h)

  const { default: jsQR } = await import('jsqr')
  const code = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' })
  return code?.data ?? null
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
