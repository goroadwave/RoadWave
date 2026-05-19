'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import {
  generateQrTokenAction,
  rotateQrTokenAction,
  type RotateState,
} from '@/app/owner/(authed)/qr/actions'
import {
  drawBrandWordmark,
  renderEmojiToPng,
} from '@/lib/owner/qr-card-brand'

// Brand colors — kept in sync with tailwind theme tokens.
const NIGHT: [number, number, number] = [10, 15, 28] // #0a0f1c
const CARD: [number, number, number] = [17, 26, 46] // #111a2e
const CREAM: [number, number, number] = [245, 236, 217] // #f5ecd9
const FLAME: [number, number, number] = [245, 158, 11] // #f59e0b
const MIST: [number, number, number] = [148, 163, 184] // #94a3b8

// Two flavours of front-desk card copy.
//
// guest-hub mode: the primary Front Desk QR a campground prints at
// the counter. Sends guests to the no-login unified hub. Wi-Fi, park
// map, rules, updates, help, reviews, rebooking.
//
// camper-connection mode: the optional secondary QR a campground
// prints for guests who want to opt into the social side — visibility
// modes, private waves, Crossed Paths. Requires an account.
type CardMode = 'guest_hub' | 'camper_connection'

const CARD_COPY: Record<
  CardMode,
  { pitch: string; privacy: string; compliance: string; caption: string }
> = {
  guest_hub: {
    pitch:
      'Scan for Wi-Fi, park info, updates, help, feedback, reviews, and rebooking.',
    privacy: 'No login required. No app download. No exact site numbers.',
    compliance:
      'Not an emergency service — call 911 first, then notify campground staff.',
    caption: 'Scan for park info, updates, and help.',
  },
  camper_connection: {
    pitch:
      'Optional camper connection. Wave privately at nearby campers with shared interests.',
    privacy:
      'Free RoadWave profile required. You control whether you are visible, quiet, or invisible.',
    compliance:
      'RoadWave is 18+. Meet in public campground areas. For emergencies call 911.',
    caption: 'Optional: scan to meet other campers.',
  },
}

type SignFormat = 'letter' | '5x7' | '4x6'

// Builds a print-ready, dark-navy-themed signage PDF at the requested
// size. Layout scales from the page width: same hierarchy at 4×6,
// 5×7, and 8.5×11.
async function buildBrandedQrPdf(args: {
  qrDataUrl: string
  /** Pre-rasterised 👋 PNG; pass null to fall back to text-only wordmark. */
  waveDataUrl: string | null
  campgroundName: string
  format: SignFormat
  mode: CardMode
}): Promise<Blob> {
  const { default: JsPDF } = await import('jspdf')
  const copy = CARD_COPY[args.mode]

  const dimensions: Record<Exclude<SignFormat, 'letter'>, [number, number]> = {
    '5x7': [360, 504],
    '4x6': [288, 432],
  }
  const doc =
    args.format === 'letter'
      ? new JsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' })
      : new JsPDF({
          unit: 'pt',
          format: dimensions[args.format],
          orientation: 'portrait',
        })

  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  doc.setFillColor(NIGHT[0], NIGHT[1], NIGHT[2])
  doc.rect(0, 0, W, H, 'F')

  const pad = W * 0.06
  const wordmarkSize = W * 0.075
  const headlineSize = W * 0.05
  const captionSize = W * 0.03
  const safetySize = W * 0.0225
  const footerSize = W * 0.02

  // 1) Canonical RoadWave wordmark.
  const yWordmark = pad + wordmarkSize
  drawBrandWordmark({
    doc,
    fontSize: wordmarkSize,
    waveDataUrl: args.waveDataUrl,
    y: yWordmark,
    align: 'center',
    x: W / 2,
  })

  // 2) Campground name headline.
  doc.setFontSize(headlineSize)
  doc.setTextColor(CREAM[0], CREAM[1], CREAM[2])
  const yHeadline = yWordmark + headlineSize * 1.15
  const nameMax = Math.floor(W / (headlineSize * 0.28))
  const printedName =
    args.campgroundName.length > nameMax
      ? args.campgroundName.slice(0, nameMax - 1).trim() + '…'
      : args.campgroundName
  doc.text(printedName, W / 2, yHeadline, { align: 'center' })

  // 3) QR on white card.
  const qrCardSize = Math.min(W - pad * 2, H * 0.5)
  const qrCardX = (W - qrCardSize) / 2
  const qrCardY = yHeadline + headlineSize * 0.6
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(qrCardX, qrCardY, qrCardSize, qrCardSize, 14, 14, 'F')
  const qrInset = qrCardSize * 0.07
  doc.addImage(
    args.qrDataUrl,
    'PNG',
    qrCardX + qrInset,
    qrCardY + qrInset,
    qrCardSize - qrInset * 2,
    qrCardSize - qrInset * 2,
  )

  // 4) Caption under the QR.
  doc.setFontSize(captionSize)
  doc.setTextColor(FLAME[0], FLAME[1], FLAME[2])
  const yCaption = qrCardY + qrCardSize + captionSize * 1.4
  doc.text(copy.caption, W / 2, yCaption, { align: 'center' })

  // 5) Pitch + privacy reassurance in a tinted card.
  const pitchSize = safetySize * 1.15
  doc.setFontSize(pitchSize)
  const pitchMaxWidth = W - pad * 2 - 24
  const pitchLines = doc.splitTextToSize(copy.pitch, pitchMaxWidth)
  const privacyLines = doc.splitTextToSize(copy.privacy, pitchMaxWidth)
  const lineHeight = pitchSize * 1.35
  const pitchBoxHeight =
    (pitchLines.length + privacyLines.length) * lineHeight + lineHeight + 18

  const yPitchBox = yCaption + captionSize * 1.1
  doc.setFillColor(CARD[0], CARD[1], CARD[2])
  doc.roundedRect(pad, yPitchBox, W - pad * 2, pitchBoxHeight, 10, 10, 'F')
  doc.setTextColor(CREAM[0], CREAM[1], CREAM[2])
  doc.text(pitchLines, W / 2, yPitchBox + lineHeight, {
    align: 'center',
    maxWidth: pitchMaxWidth,
  })
  doc.setTextColor(MIST[0], MIST[1], MIST[2])
  doc.text(
    privacyLines,
    W / 2,
    yPitchBox + lineHeight + pitchLines.length * lineHeight + lineHeight * 0.6,
    { align: 'center', maxWidth: pitchMaxWidth },
  )

  // 6) Compliance footer + brand line.
  doc.setFontSize(footerSize)
  doc.setTextColor(MIST[0], MIST[1], MIST[2])
  const yCompliance = H - pad * 1.4
  const complianceLines = doc.splitTextToSize(copy.compliance, W - pad * 2)
  doc.text(complianceLines, W / 2, yCompliance, { align: 'center' })
  doc.text('getroadwave.com', W / 2, H - pad * 0.6, { align: 'center' })

  return doc.output('blob')
}

const initialState: RotateState = { error: null, ok: false }

type Props = {
  campgroundId: string
  campgroundName: string
  token: string | null
  rotatedAt: string | null
  /** Always present — the no-login Front Desk Guest Hub URL. */
  guestHubUrl: string
  /**
   * Camper-connection URL (guest hub + ?token=<uuid>). Null when no
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
  // Two QR data URLs — one per mode. Re-rendered whenever the source
  // URL changes (camperConnectionUrl rotates with the token).
  const [guestHubDataUrl, setGuestHubDataUrl] = useState<string | null>(null)
  const [camperDataUrl, setCamperDataUrl] = useState<string | null>(null)

  // 👋 rasterised to a transparent PNG via the browser canvas + the
  // OS's color-emoji font. jsPDF's built-in helvetica can't render
  // emoji codepoints, so the wave next to the wordmark inside every
  // generated PDF gets embedded as this PNG image instead. Rendered
  // once on mount and reused across both PDFs.
  const [waveDataUrl, setWaveDataUrl] = useState<string | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [copyState, setCopyState] = useState<{
    mode: CardMode | null
    status: 'idle' | 'copied' | 'error'
  }>({ mode: null, status: 'idle' })

  // PDF render busy state, keyed by mode+format so the right button
  // shows the spinner without blocking the other section.
  const [pdfBusy, setPdfBusy] = useState<{
    mode: CardMode
    format: SignFormat
  } | null>(null)

  const [state, formAction, pending] = useActionState(
    rotateQrTokenAction,
    initialState,
  )
  const guestHubDownloadRef = useRef<HTMLAnchorElement | null>(null)
  const camperDownloadRef = useRef<HTMLAnchorElement | null>(null)

  async function handleCopyLink(mode: CardMode, url: string | null) {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopyState({ mode, status: 'copied' })
      window.setTimeout(
        () => setCopyState({ mode: null, status: 'idle' }),
        2000,
      )
    } catch {
      setCopyState({ mode, status: 'error' })
      window.setTimeout(
        () => setCopyState({ mode: null, status: 'idle' }),
        2500,
      )
    }
  }

  // Render the QRs locally as PNG data URLs so the user can preview AND
  // download. Re-renders when source URLs change.
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

  // Pre-render the 👋 emoji to a transparent PNG once on mount so
  // buildBrandedQrPdf can embed it as part of the canonical wordmark.
  useEffect(() => {
    setWaveDataUrl(renderEmojiToPng('👋', 192))
  }, [])

  const baseFilename = `${slug(campgroundName)}-roadwave-qr`

  async function downloadPdf(mode: CardMode, format: SignFormat) {
    const dataUrl = mode === 'guest_hub' ? guestHubDataUrl : camperDataUrl
    if (!dataUrl) return
    setPdfBusy({ mode, format })
    try {
      const blob = await buildBrandedQrPdf({
        qrDataUrl: dataUrl,
        waveDataUrl,
        campgroundName,
        format,
        mode,
      })
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      const sizeTag =
        format === 'letter' ? '8.5x11' : format === '5x7' ? '5x7' : '4x6'
      const modeTag = mode === 'guest_hub' ? 'guest-hub' : 'camper-connection'
      a.download = `${baseFilename}-${modeTag}-${sizeTag}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'PDF render failed.'
      setRenderError(msg)
    } finally {
      setPdfBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* ============================================================
          PRIMARY: Front Desk Guest Hub QR.
          Always available -- this URL doesn't need a token row, so
          every campground can print this QR immediately.
          ============================================================ */}
      <section className="rounded-2xl border border-flame/30 bg-flame/[0.05] p-5 sm:p-6 space-y-4">
        <header className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
            Front Desk Guest Hub QR — primary
          </p>
          <h2 className="font-display text-xl font-extrabold text-cream">
            Scan for Wi-Fi, map, rules, updates, help, reviews, and
            rebooking.
          </h2>
          <p className="text-xs text-mist leading-snug">
            No login. No account. No email confirmation. Print this and
            post it at your front desk, welcome packet, activity board,
            or check-in counter.
          </p>
        </header>

        <div className="mx-auto w-full max-w-sm aspect-square rounded-xl overflow-hidden bg-white grid place-items-center p-3">
          {guestHubDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL, no need for next/image
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
          <p className="font-display text-lg font-extrabold text-cream">
            {campgroundName}
          </p>
          <p className="text-[11px] text-mist break-all">{guestHubUrl}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => handleCopyLink('guest_hub', guestHubUrl)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-leaf/40 bg-leaf/10 text-leaf px-4 py-2.5 text-sm font-semibold hover:bg-leaf/20 transition-colors"
          >
            {copyState.mode === 'guest_hub' && copyState.status === 'copied'
              ? '✓ Link copied'
              : copyState.mode === 'guest_hub' && copyState.status === 'error'
                ? 'Copy failed'
                : 'Copy Link'}
          </button>
          <a
            ref={guestHubDownloadRef}
            href={guestHubDataUrl ?? '#'}
            download={`${baseFilename}-guest-hub.png`}
            aria-disabled={!guestHubDataUrl}
            className={
              guestHubDataUrl
                ? 'inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 text-cream px-4 py-2.5 text-sm font-semibold hover:bg-white/10 hover:border-flame/40 transition-colors'
                : 'inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 text-mist/50 px-4 py-2.5 text-sm font-semibold cursor-not-allowed'
            }
          >
            Download QR Code
          </a>
          <button
            type="button"
            onClick={() =>
              printFrontDeskCard(
                guestHubDataUrl,
                campgroundName,
                guestHubUrl,
                'guest_hub',
              )
            }
            disabled={!guestHubDataUrl}
            className={
              guestHubDataUrl
                ? 'inline-flex items-center justify-center gap-2 rounded-lg bg-flame text-night px-4 py-2.5 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 transition-colors'
                : 'inline-flex items-center justify-center gap-2 rounded-lg bg-flame/50 text-night/50 px-4 py-2.5 text-sm font-semibold cursor-not-allowed'
            }
          >
            Print Front Desk Card
          </button>
        </div>

        <div className="space-y-2 pt-2 border-t border-white/5">
          <p className="text-center text-[11px] uppercase tracking-[0.2em] text-mist">
            Print-ready signage PDF
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(['letter', '5x7', '4x6'] as SignFormat[]).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => downloadPdf('guest_hub', fmt)}
                disabled={!guestHubDataUrl || pdfBusy !== null}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-flame/40 bg-flame/10 text-flame px-3 py-2.5 text-sm font-semibold hover:bg-flame/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {pdfBusy?.mode === 'guest_hub' && pdfBusy.format === fmt
                  ? 'Building…'
                  : fmt === 'letter'
                    ? '8.5 × 11'
                    : fmt === '5x7'
                      ? '5 × 7'
                      : '4 × 6'}
              </button>
            ))}
          </div>
          <p className="text-center text-[11px] text-mist/70">
            All three sizes include the RoadWave brand, your QR, and
            the front-desk safety copy.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECONDARY: Optional Camper Connection QR.
          Only available when a campground_qr_tokens row exists. If
          missing, the NoQrTokenCard offers to provision one. The owner
          can also rotate / regenerate the token here -- only this QR
          carries one.
          ============================================================ */}
      {camperConnectionUrl && token ? (
        <section className="rounded-2xl border border-white/5 bg-card p-5 sm:p-6 space-y-4">
          <header className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.2em] text-mist font-semibold">
              Optional Camper Connection QR — secondary
            </p>
            <h2 className="font-display text-lg font-extrabold text-cream">
              For guests who want to meet nearby campers.
            </h2>
            <p className="text-xs text-mist leading-snug">
              This QR opts a guest into RoadWave camper connection —
              private waves, visibility modes (Visible / Quiet /
              Invisible), Crossed Paths. Requires a free RoadWave
              profile. <strong>Most campgrounds don&apos;t need to
              print this</strong> — share it digitally with guests who
              ask about the social features.
            </p>
          </header>

          <div className="mx-auto w-full max-w-xs aspect-square rounded-xl overflow-hidden bg-white grid place-items-center p-3">
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
                Issued {new Date(rotatedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() =>
                handleCopyLink('camper_connection', camperConnectionUrl)
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-leaf/40 bg-leaf/10 text-leaf px-4 py-2.5 text-sm font-semibold hover:bg-leaf/20 transition-colors"
            >
              {copyState.mode === 'camper_connection' &&
              copyState.status === 'copied'
                ? '✓ Link copied'
                : copyState.mode === 'camper_connection' &&
                    copyState.status === 'error'
                  ? 'Copy failed'
                  : 'Copy Link'}
            </button>
            <a
              ref={camperDownloadRef}
              href={camperDataUrl ?? '#'}
              download={`${baseFilename}-camper-connection.png`}
              aria-disabled={!camperDataUrl}
              className={
                camperDataUrl
                  ? 'inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 text-cream px-4 py-2.5 text-sm font-semibold hover:bg-white/10 hover:border-flame/40 transition-colors'
                  : 'inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 text-mist/50 px-4 py-2.5 text-sm font-semibold cursor-not-allowed'
              }
            >
              Download QR Code
            </a>
            <button
              type="button"
              onClick={() =>
                printFrontDeskCard(
                  camperDataUrl,
                  campgroundName,
                  camperConnectionUrl,
                  'camper_connection',
                )
              }
              disabled={!camperDataUrl}
              className={
                camperDataUrl
                  ? 'inline-flex items-center justify-center gap-2 rounded-lg border border-flame/40 bg-flame/10 text-flame px-4 py-2.5 text-sm font-semibold hover:bg-flame/20 transition-colors'
                  : 'inline-flex items-center justify-center gap-2 rounded-lg border border-flame/20 bg-flame/[0.04] text-flame/40 px-4 py-2.5 text-sm font-semibold cursor-not-allowed'
              }
            >
              Print Card
            </button>
          </div>

          <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-4 space-y-2 mt-2">
            <p className="font-semibold text-cream text-sm">
              Regenerate camper-connection QR
            </p>
            <p className="text-xs text-mist leading-snug">
              This rotates the token in the camper-connection URL.
              Any printed camper-connection QRs stop working
              immediately. The Front Desk Guest Hub QR above is{' '}
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
    <section className="rounded-2xl border border-flame/30 bg-card p-6 text-center space-y-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-mist font-semibold">
        Optional Camper Connection QR
      </p>
      <p className="font-display text-lg font-extrabold text-cream">
        Camper-connection QR not generated yet
      </p>
      <p className="text-sm text-mist leading-relaxed max-w-md mx-auto">
        Generate the optional camper-connection QR if you want guests to
        be able to opt into private waves and visibility modes. The
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

// Print a complete front-desk card — RoadWave wordmark, campground
// name, large QR on a white card, the pitch + privacy copy, and a
// small compliance footer. Opens a new tab with a centered,
// brand-coloured page that auto-fires the print dialog and closes
// itself after print. Mode picks the copy variant.
function printFrontDeskCard(
  dataUrl: string | null,
  campgroundName: string,
  url: string | null,
  mode: CardMode,
): void {
  if (!dataUrl) return
  const copy = CARD_COPY[mode]
  const w = window.open('', '_blank', 'noopener,noreferrer,width=620,height=900')
  if (!w) {
    window.location.href = dataUrl
    return
  }
  const safe = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeName = safe(campgroundName)
  const safeUrl = url ? safe(url) : ''
  w.document.open()
  w.document.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>RoadWave ${mode === 'guest_hub' ? 'front-desk' : 'camper-connection'} card — ${safeName}</title>
<style>
  html, body { margin: 0; padding: 0; background: #0a0f1c; }
  .wrap {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 24px;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    color: #f5ecd9;
    text-align: center;
  }
  .brand {
    font-family: Georgia, serif;
    font-weight: 800;
    font-size: 38px;
    letter-spacing: -0.02em;
    line-height: 1;
    white-space: nowrap;
    margin: 0 0 8px;
  }
  .brand .road  { color: #f5ecd9; }
  .brand .wave  { color: #f59e0b; }
  .brand .emoji { font-size: 36px; }
  .name {
    font-size: 20px;
    font-weight: 700;
    margin: 0 0 24px;
    color: #f5ecd9;
  }
  .card {
    background: #ffffff;
    border-radius: 18px;
    padding: 16px;
    margin: 0 0 22px;
  }
  .card img { display: block; width: 360px; height: 360px; max-width: 100%; }
  .pitch  {
    font-size: 18px;
    font-weight: 700;
    color: #f59e0b;
    margin: 0 0 14px;
    max-width: 460px;
  }
  .desc   {
    font-size: 14px;
    line-height: 1.5;
    color: #f5ecd9;
    margin: 0 0 10px;
    max-width: 460px;
  }
  .privacy {
    font-size: 13px;
    line-height: 1.5;
    color: #94a3b8;
    margin: 0 0 26px;
    max-width: 460px;
  }
  .compliance {
    font-size: 11px;
    line-height: 1.5;
    color: #94a3b8;
    margin: 0 0 4px;
    max-width: 460px;
  }
  .url {
    font-size: 10px;
    color: #64748b;
    word-break: break-all;
    max-width: 460px;
  }
  @media print {
    html, body, .wrap { background: #ffffff !important; color: #0a0f1c !important; }
    .brand .road, .name, .desc { color: #0a0f1c !important; }
    .privacy, .compliance, .url { color: #475569 !important; }
    .card { box-shadow: none; }
  }
</style>
</head>
<body>
  <div class="wrap">
    <p class="brand">
      <span class="road">Road</span><span class="wave">Wave<span class="emoji" aria-hidden="true">👋</span></span>
    </p>
    <p class="name">${safeName}</p>
    <div class="card"><img src="${dataUrl}" alt="RoadWave QR" /></div>
    <p class="pitch">${safe(copy.caption)}</p>
    <p class="desc">${safe(copy.pitch)}</p>
    <p class="privacy">${safe(copy.privacy)}</p>
    <p class="compliance">${safe(copy.compliance)}</p>
    <p class="url">${safeUrl || 'getroadwave.com'}</p>
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () {
        window.focus();
        window.print();
      }, 150);
      window.addEventListener('afterprint', function () { window.close(); });
    });
  </script>
</body>
</html>`)
  w.document.close()
}
