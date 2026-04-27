'use client'

import { useEffect, useRef } from 'react'

const READER_ID = 'roadwave-qr-reader'

type Props = {
  onResult: (text: string) => void
  onError?: (message: string) => void
}

export function QrScanner({ onResult, onError }: Props) {
  const handlerRef = useRef<{ onResult: typeof onResult; onError?: typeof onError }>({
    onResult,
    onError,
  })
  useEffect(() => {
    handlerRef.current = { onResult, onError }
  })

  useEffect(() => {
    let cancelled = false
    let scanner: { clear: () => Promise<void> } | null = null

    ;(async () => {
      try {
        const mod = await import('html5-qrcode')
        if (cancelled) return
        const Scanner = mod.Html5QrcodeScanner
        const instance = new Scanner(
          READER_ID,
          { fps: 10, qrbox: 240, rememberLastUsedCamera: true },
          false,
        )
        instance.render(
          (decoded: string) => handlerRef.current.onResult(decoded),
          () => {
            // ignore intermittent decode failures
          },
        )
        scanner = instance
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not start camera.'
        handlerRef.current.onError?.(message)
      }
    })()

    return () => {
      cancelled = true
      scanner?.clear().catch(() => {
        /* swallow cleanup errors */
      })
    }
  }, [])

  return (
    <div>
      <div id={READER_ID} className="overflow-hidden rounded-lg" />
      <p className="mt-2 text-xs text-stone-500">
        Allow camera access. Point at the QR code on the campground sign.
      </p>
    </div>
  )
}
