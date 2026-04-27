'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { QrScanner } from './qr-scanner'
import { extractToken } from '@/lib/validators/checkin'

export function CheckInControls() {
  const router = useRouter()
  const [scanError, setScanError] = useState<string | null>(null)
  const [pasteValue, setPasteValue] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)

  function handleScanResult(scanned: string) {
    const token = extractToken(scanned)
    if (!token) {
      setScanError("That QR doesn't look like a RoadWave check-in.")
      return
    }
    setScannerOpen(false)
    router.push(`/checkin?token=${token}`)
  }

  function handlePasteSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = extractToken(pasteValue.trim())
    if (!token) {
      setScanError('Paste a full check-in link or just the token.')
      return
    }
    router.push(`/checkin?token=${token}`)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/5 bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-cream">Scan a campground QR</h2>
          <button
            type="button"
            onClick={() => {
              setScannerOpen((v) => !v)
              setScanError(null)
            }}
            className="text-sm font-semibold text-flame underline-offset-2 hover:underline"
          >
            {scannerOpen ? 'Stop' : 'Start camera'}
          </button>
        </div>
        {scannerOpen && (
          <div className="mt-3">
            <QrScanner onResult={handleScanResult} onError={setScanError} />
          </div>
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

      {scanError && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
          {scanError}
        </p>
      )}
    </div>
  )
}
