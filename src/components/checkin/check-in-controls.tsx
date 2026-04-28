'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { QrScanner } from './qr-scanner'
import { extractToken } from '@/lib/validators/checkin'

export function CheckInControls() {
  const router = useRouter()
  const [scanError, setScanError] = useState<string | null>(null)
  const [pasteValue, setPasteValue] = useState('')

  function handleScanResult(scanned: string) {
    console.log('[checkin] scanned text from QR:', scanned)
    setScanError(null)
    const token = extractToken(scanned)
    console.log('[checkin] extractToken returned:', token)

    if (!token) {
      const msg =
        "That QR scanned, but it doesn't include a RoadWave check-in token. Make sure you're scanning the QR from the campground."
      setScanError(msg)
      return
    }

    const dest = `/checkin?token=${token}`
    console.log('[checkin] redirecting to:', dest)
    router.push(dest)
  }

  function handleScannerError(message: string) {
    // The scanner already shows its own error inside the scan card. Mirroring
    // it into scanError would double up; we just log for debugging.
    console.warn('[checkin] scanner error:', message)
  }

  function handlePasteSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = extractToken(pasteValue.trim())
    if (!token) {
      setScanError('Paste a full check-in link or just the token.')
      return
    }
    setScanError(null)
    router.push(`/checkin?token=${token}`)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/5 bg-card p-4 space-y-3">
        <h2 className="font-semibold text-cream">Scan a campground QR</h2>
        <QrScanner onResult={handleScanResult} onError={handleScannerError} />
        {scanError && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
            {scanError}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-white/5 bg-card p-4">
        <h2 className="mb-2 font-semibold text-cream">Or paste a check-in link</h2>
        <form onSubmit={handlePasteSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            value={pasteValue}
            onChange={(e) => setPasteValue(e.target.value)}
            placeholder="https://… or token UUID"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame"
          />
          <button
            type="submit"
            className="rounded-lg bg-flame text-night px-4 py-2 text-sm font-semibold hover:bg-amber-400"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  )
}
