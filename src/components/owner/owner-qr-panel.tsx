'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import {
  rotateQrTokenAction,
  type RotateState,
} from '@/app/owner/(authed)/qr/actions'

const initialState: RotateState = { error: null, ok: false }

type Props = {
  campgroundId: string
  campgroundName: string
  token: string | null
  rotatedAt: string | null
  checkInUrl: string | null
}

export function OwnerQrPanel({
  campgroundId,
  campgroundName,
  token,
  rotatedAt,
  checkInUrl,
}: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [state, formAction, pending] = useActionState(
    rotateQrTokenAction,
    initialState,
  )
  const downloadRef = useRef<HTMLAnchorElement | null>(null)

  // Render the QR locally as a PNG data URL so the user can preview AND
  // download the same image. Re-renders when token rotates.
  useEffect(() => {
    if (!checkInUrl) {
      setDataUrl(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const QR = await import('qrcode')
        const url = await QR.toDataURL(checkInUrl, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 600,
          color: { dark: '#0a0f1c', light: '#ffffff' },
        })
        if (!cancelled) setDataUrl(url)
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Could not render QR.'
          setRenderError(msg)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [checkInUrl])

  if (!token || !checkInUrl) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-card p-6 text-center text-sm text-mist">
        No QR token has been issued for your campground yet.{' '}
        <a
          href="mailto:markhalesmith@gmail.com"
          className="text-flame underline-offset-2 hover:underline"
        >
          Email us
        </a>{' '}
        and we&apos;ll provision one.
      </div>
    )
  }

  const filename =
    `${slug(campgroundName)}-roadwave-qr.png`

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/5 bg-card p-5 sm:p-6 space-y-4">
        <div className="mx-auto w-full max-w-xs aspect-square rounded-xl overflow-hidden bg-white grid place-items-center">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL, no need for next/image
            <img
              src={dataUrl}
              alt={`Check-in QR for ${campgroundName}`}
              className="h-full w-full object-contain"
            />
          ) : (
            <p className="text-sm text-night/60">Rendering QR…</p>
          )}
        </div>

        <div className="text-center space-y-1">
          <p className="font-display text-lg font-extrabold text-cream">
            {campgroundName}
          </p>
          <p className="text-[11px] text-mist break-all">{checkInUrl}</p>
          {rotatedAt && (
            <p className="text-[10px] text-mist/70">
              Issued {new Date(rotatedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <a
            ref={downloadRef}
            href={dataUrl ?? '#'}
            download={filename}
            aria-disabled={!dataUrl}
            className={
              dataUrl
                ? 'inline-flex items-center justify-center gap-2 rounded-lg bg-flame text-night px-4 py-2.5 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 transition-colors'
                : 'inline-flex items-center justify-center gap-2 rounded-lg bg-flame/40 text-night/60 px-4 py-2.5 text-sm font-semibold cursor-not-allowed'
            }
          >
            Download PNG
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 text-cream px-4 py-2.5 text-sm font-semibold hover:bg-white/10 hover:border-flame/40 transition-colors"
          >
            Print
          </button>
        </div>
        {renderError && (
          <p className="text-center text-xs text-red-300">{renderError}</p>
        )}
      </div>

      <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-4 space-y-2">
        <p className="font-semibold text-cream text-sm">Regenerate QR</p>
        <p className="text-xs text-mist leading-snug">
          This will invalidate your current QR code immediately. All printed
          codes will stop working.
        </p>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 px-3 py-1.5 text-xs font-semibold hover:bg-red-500/20 transition-colors"
          >
            Regenerate QR code
          </button>
        ) : (
          <form action={formAction} className="flex flex-wrap gap-2 items-center">
            <input type="hidden" name="campground_id" value={campgroundId} />
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-red-500 text-white px-3 py-1.5 text-xs font-semibold hover:bg-red-400 disabled:opacity-50 transition-colors"
            >
              {pending ? 'Rotating…' : 'Yes, invalidate the old QR'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-xs text-mist hover:text-cream underline-offset-2 hover:underline"
            >
              Never mind
            </button>
          </form>
        )}
        {state.error && (
          <p className="text-xs text-red-300">{state.error}</p>
        )}
        {state.ok && (
          <p className="text-xs text-leaf">New QR code generated.</p>
        )}
      </div>

      <p className="text-xs text-mist italic">
        PDF downloads coming soon. For now, print this page or download the PNG
        and drop it into your existing welcome-sign template.
      </p>
    </div>
  )
}

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'campground'
  )
}
