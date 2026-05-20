'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import {
  generateQrTokenAction,
  rotateQrTokenAction,
  type RotateState,
} from '@/app/owner/(authed)/qr/actions'

// Owner QR panel. Three clearly-labeled options, in priority order
// matching the no-login guest-hub product direction:
//
//   1. PRIMARY -- Front Desk Guest Hub Card. The branded print-ready
//      counter sign every campground gets by default. QR points to
//      /campground/<slug> (no login, no token, no /checkin redirect).
//      "Download / Print Front Desk Card" opens the dedicated
//      printable route at /owner/print/front-desk-card -- which
//      server-renders the card with campground branding + QR +
//      bullet list and auto-fires the print dialog when ready.
//
//   2. SECONDARY -- Download QR Only. The raw QR image for owners
//      who want to drop it into their own flyers, welcome packets,
//      maps, signage, or email templates. Same /campground/<slug>
//      destination as the primary card.
//
//   3. OPTIONAL -- Camper Connection QR. Encodes /checkin?token=<uuid>
//      for guests who want to opt into the social side (private
//      waves, visibility modes, Crossed Paths). Most campgrounds
//      won't need to print this -- it's offered as a share-digitally
//      option for guests who ask about the social features. Anon
//      scans are bridged through /signup?next= by the proxy
//      middleware so the token survives signup.

const initialState: RotateState = { error: null, ok: false }

type Props = {
  campgroundId: string
  campgroundName: string
  token: string | null
  rotatedAt: string | null
  /** Always present — the no-login Front Desk Guest Hub URL. */
  guestHubUrl: string
  /**
   * Camper-connection URL (/checkin?token=<uuid>). Null when no
   * campground_qr_tokens row exists; the secondary section asks the
   * owner to provision one.
   */
  camperConnectionUrl: string | null
}

export function OwnerQrPanel({
  campgroundId,
  campgroundName,
  token,
  rotatedAt,
  guestHubUrl,
  camperConnectionUrl,
}: Props) {
  // Two QR PNG data URLs -- one per destination. Both rendered
  // client-side so the owner can preview AND download the same
  // image. Server-rendered QR lives in the dedicated print route
  // (/owner/print/front-desk-card) where decode-before-print matters.
  const [guestHubDataUrl, setGuestHubDataUrl] = useState<string | null>(null)
  const [camperDataUrl, setCamperDataUrl] = useState<string | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [copyState, setCopyState] = useState<{
    target: 'guest_hub' | 'camper' | null
    status: 'idle' | 'copied' | 'error'
  }>({ target: null, status: 'idle' })

  const [state, formAction, pending] = useActionState(
    rotateQrTokenAction,
    initialState,
  )
  const guestHubDownloadRef = useRef<HTMLAnchorElement | null>(null)
  const camperDownloadRef = useRef<HTMLAnchorElement | null>(null)

  async function handleCopyLink(
    target: 'guest_hub' | 'camper',
    url: string | null,
  ) {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopyState({ target, status: 'copied' })
      window.setTimeout(
        () => setCopyState({ target: null, status: 'idle' }),
        2000,
      )
    } catch {
      setCopyState({ target, status: 'error' })
      window.setTimeout(
        () => setCopyState({ target: null, status: 'idle' }),
        2500,
      )
    }
  }

  // Render each QR locally as a PNG data URL so we can preview AND
  // hand the same image off to the download anchor.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const QR = await import('qrcode')
        const url = await QR.toDataURL(guestHubUrl, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 600,
          color: { dark: '#0a0f1c', light: '#ffffff' },
        })
        if (!cancelled) setGuestHubDataUrl(url)
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
  }, [guestHubUrl])

  useEffect(() => {
    if (!camperConnectionUrl) {
      setCamperDataUrl(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const QR = await import('qrcode')
        const url = await QR.toDataURL(camperConnectionUrl, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 600,
          color: { dark: '#0a0f1c', light: '#ffffff' },
        })
        if (!cancelled) setCamperDataUrl(url)
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
  }, [camperConnectionUrl])

  const baseFilename = `${slug(campgroundName)}-roadwave-qr`

  return (
    <div className="space-y-6">
      {/* ============================================================
          1. PRIMARY — Front Desk Guest Hub Card.
          ============================================================ */}
      <section className="rounded-2xl border border-flame/30 bg-flame/[0.05] p-5 sm:p-6 space-y-4">
        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
            1 · Primary
          </p>
          <h2 className="font-display text-xl sm:text-2xl font-extrabold text-cream leading-tight">
            Front Desk Guest Hub Card
          </h2>
          <p className="text-sm text-mist leading-snug">
            Print this for your counter so guests can scan for Wi-Fi,
            park info, updates, help, reviews, rebooking, and optional
            camper connection.
          </p>
        </header>

        {/* Inline preview of the QR that's embedded in the print card.
            Same destination — /campground/<slug> — so previewing here
            matches what gets printed. */}
        <div className="mx-auto w-full max-w-xs aspect-square rounded-xl overflow-hidden bg-white grid place-items-center p-3">
          {guestHubDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL
            <img
              src={guestHubDataUrl}
              alt={`Front Desk Guest Hub QR for ${campgroundName}`}
              className="h-full w-full object-contain"
            />
          ) : (
            <p className="text-sm text-night/60">Rendering QR…</p>
          )}
        </div>

        <div className="text-center space-y-1">
          <p className="text-[11px] text-mist break-all">{guestHubUrl}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href="/owner/print/front-desk-card"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-flame text-night px-4 py-3 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 transition-colors"
          >
            <span aria-hidden>🖨️</span>
            Download / Print Front Desk Card
          </Link>
          <button
            type="button"
            onClick={() => handleCopyLink('guest_hub', guestHubUrl)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-leaf/40 bg-leaf/10 text-leaf px-4 py-3 text-sm font-semibold hover:bg-leaf/20 transition-colors"
          >
            {copyState.target === 'guest_hub' && copyState.status === 'copied'
              ? '✓ Link copied'
              : copyState.target === 'guest_hub' && copyState.status === 'error'
                ? 'Copy failed'
                : 'Copy Guest Hub Link'}
          </button>
        </div>
        <p className="text-[11px] text-mist/70 leading-snug">
          Opens a print-ready card with your campground name, logo, the
          QR, and what guests can do — Wi-Fi, park map, rules,
          emergency info, local recommendations, reviews, and more.
        </p>
      </section>

      {/* ============================================================
          2. SECONDARY — Download QR Only.
          ============================================================ */}
      <section className="rounded-2xl border border-white/5 bg-card p-5 sm:p-6 space-y-3">
        <header className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.2em] text-mist font-semibold">
            2 · Secondary
          </p>
          <h2 className="font-display text-lg font-extrabold text-cream">
            Download QR Only
          </h2>
          <p className="text-sm text-mist leading-snug">
            Use this if you want to place the QR code into your own
            flyers, maps, welcome packets, emails, or signs. Same
            destination as the Front Desk card — no login required.
          </p>
        </header>

        <div className="grid gap-2 sm:grid-cols-2">
          <a
            ref={guestHubDownloadRef}
            href={guestHubDataUrl ?? '#'}
            download={`${baseFilename}-guest-hub.png`}
            aria-disabled={!guestHubDataUrl}
            className={
              guestHubDataUrl
                ? 'inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 text-cream px-4 py-3 text-sm font-semibold hover:bg-white/10 hover:border-flame/40 transition-colors'
                : 'inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 text-mist/50 px-4 py-3 text-sm font-semibold cursor-not-allowed'
            }
          >
            <span aria-hidden>📥</span>
            Download QR Only
          </a>
          <Link
            href={guestHubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 text-cream px-4 py-3 text-sm font-semibold hover:bg-white/10 hover:border-flame/40 transition-colors"
          >
            <span aria-hidden>↗</span>
            Open Guest Hub
          </Link>
        </div>
        <p className="text-[11px] text-mist/70 leading-snug break-all">
          QR destination: <span className="text-mist">{guestHubUrl}</span>
        </p>
      </section>

      {/* ============================================================
          3. OPTIONAL — Camper Connection QR.
          ============================================================ */}
      {camperConnectionUrl && token ? (
        <section className="rounded-2xl border border-white/5 bg-card p-5 sm:p-6 space-y-4">
          <header className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.2em] text-mist font-semibold">
              3 · Optional
            </p>
            <h2 className="font-display text-lg font-extrabold text-cream">
              Optional Camper Connection QR
            </h2>
            <p className="text-sm text-mist leading-snug">
              Use this only if you want guests to go directly into the
              optional RoadWave camper connection / check-in flow.
              Most campgrounds don&apos;t need to print this — share
              it digitally with guests who ask about the social
              features.
            </p>
          </header>

          <div className="mx-auto w-full max-w-[200px] aspect-square rounded-xl overflow-hidden bg-white grid place-items-center p-3">
            {camperDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL
              <img
                src={camperDataUrl}
                alt={`Optional Camper Connection QR for ${campgroundName}`}
                className="h-full w-full object-contain"
              />
            ) : (
              <p className="text-sm text-night/60">Rendering QR…</p>
            )}
          </div>

          <div className="text-center space-y-1">
            <p className="text-[11px] text-mist break-all">
              {camperConnectionUrl}
            </p>
            {rotatedAt && (
              <p className="text-[10px] text-mist/70">
                Token issued {new Date(rotatedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <a
              ref={camperDownloadRef}
              href={camperDataUrl ?? '#'}
              download={`${baseFilename}-camper-connection.png`}
              aria-disabled={!camperDataUrl}
              className={
                camperDataUrl
                  ? 'inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 text-cream px-4 py-3 text-sm font-semibold hover:bg-white/10 hover:border-flame/40 transition-colors'
                  : 'inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 text-mist/50 px-4 py-3 text-sm font-semibold cursor-not-allowed'
              }
            >
              <span aria-hidden>📥</span>
              Download Camper Connection QR
            </a>
            <button
              type="button"
              onClick={() => handleCopyLink('camper', camperConnectionUrl)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-leaf/40 bg-leaf/10 text-leaf px-4 py-3 text-sm font-semibold hover:bg-leaf/20 transition-colors"
            >
              {copyState.target === 'camper' && copyState.status === 'copied'
                ? '✓ Link copied'
                : copyState.target === 'camper' && copyState.status === 'error'
                  ? 'Copy failed'
                  : 'Copy Camper Connection Link'}
            </button>
          </div>

          <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-4 space-y-2">
            <p className="font-semibold text-cream text-sm">
              Regenerate camper-connection QR
            </p>
            <p className="text-xs text-mist leading-snug">
              This rotates the token in the camper-connection URL. Any
              printed camper-connection QRs stop working immediately.
              The Front Desk Guest Hub QR above is{' '}
              <strong>not affected</strong>.
            </p>
            {!confirming ? (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 px-3 py-1.5 text-xs font-semibold hover:bg-red-500/20 transition-colors"
              >
                Regenerate camper-connection QR
              </button>
            ) : (
              <form
                action={formAction}
                className="flex flex-wrap gap-2 items-center"
              >
                <input
                  type="hidden"
                  name="campground_id"
                  value={campgroundId}
                />
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-red-500 text-white px-3 py-1.5 text-xs font-semibold hover:bg-red-400 disabled:opacity-50 transition-colors"
                >
                  {pending
                    ? 'Rotating…'
                    : 'Yes, invalidate the old camper-connection QR'}
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
            {state.error && <p className="text-xs text-red-300">{state.error}</p>}
            {state.ok && (
              <p className="text-xs text-leaf">
                New camper-connection QR generated.
              </p>
            )}
          </div>
        </section>
      ) : (
        <NoQrTokenCard campgroundId={campgroundId} />
      )}

      {renderError && (
        <p className="text-center text-xs text-red-300">{renderError}</p>
      )}
    </div>
  )
}

// Pre-token state for the secondary Camper Connection QR. Campground
// exists but campground_qr_tokens has no row yet. Owner can self-serve
// provisioning. The Front Desk Guest Hub QR above is unaffected and
// remains usable while this is empty.
function NoQrTokenCard({ campgroundId }: { campgroundId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onGenerate() {
    setError(null)
    startTransition(async () => {
      const res = await generateQrTokenAction(campgroundId)
      if (!res.ok) setError(res.error ?? 'Could not generate a QR token.')
    })
  }

  return (
    <section className="rounded-2xl border border-white/5 bg-card p-5 sm:p-6 text-center space-y-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-mist font-semibold">
        3 · Optional
      </p>
      <p className="font-display text-lg font-extrabold text-cream">
        Optional Camper Connection QR not generated yet
      </p>
      <p className="text-sm text-mist leading-relaxed max-w-md mx-auto">
        Generate the optional camper-connection QR if you want guests
        to be able to opt into private waves and visibility modes. The
        Front Desk Guest Hub QR above already works without this.
      </p>
      <div className="pt-1">
        <button
          type="button"
          onClick={onGenerate}
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-flame text-night px-5 py-2.5 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? 'Generating…' : 'Generate camper-connection QR'}
        </button>
      </div>
      {error && <p className="text-xs text-red-300 leading-snug">{error}</p>}
    </section>
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
