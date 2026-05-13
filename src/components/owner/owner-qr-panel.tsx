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

// Front-desk card copy. Leads with the welcoming pitch, follows
// with the privacy reassurance, and keeps a compact compliance
// footer (18+ + emergency line) below the user-facing copy.
const FRONT_DESK_PITCH =
  'See campground updates, meetup prompts, and friendly nearby campers — only if you want to.'
const FRONT_DESK_PRIVACY =
  'No exact site number. No always-on GPS. You control your visibility.'
const FRONT_DESK_COMPLIANCE =
  'RoadWave is 18+. Meet in public campground areas. For emergencies call 911 and notify campground staff.'

type SignFormat = 'letter' | '5x7'

// Builds a print-ready, dark-navy-themed signage PDF at the requested size.
// Layout scales from the page width: same hierarchy at 5×7 and 8.5×11.
async function buildBrandedQrPdf(args: {
  qrDataUrl: string
  /** Pre-rasterised 👋 PNG; pass null to fall back to text-only wordmark. */
  waveDataUrl: string | null
  campgroundName: string
  format: SignFormat
}): Promise<Blob> {
  const { default: JsPDF } = await import('jspdf')

  // jsPDF accepts 'letter' as a name, but '5x7' has to be passed as
  // explicit dimensions in the unit ('in'). Standard print sizes:
  //   letter = 8.5 × 11 in → 612 × 792 pt
  //   5×7    = 5   × 7  in → 360 × 504 pt
  const doc =
    args.format === 'letter'
      ? new JsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' })
      : new JsPDF({ unit: 'pt', format: [360, 504], orientation: 'portrait' })

  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  // Background — solid night across the full page bleed.
  doc.setFillColor(NIGHT[0], NIGHT[1], NIGHT[2])
  doc.rect(0, 0, W, H, 'F')

  // Layout pads + sizing scale by page width so 5x7 looks coherent.
  const pad = W * 0.06
  const wordmarkSize = W * 0.075
  const headlineSize = W * 0.05
  const captionSize = W * 0.03
  const safetySize = W * 0.0225
  const footerSize = W * 0.02

  // 1) Canonical RoadWave wordmark — cream "Road", flame "Wave", 👋
  // PNG flush against "Wave". The shared helper handles the emoji
  // rasterisation; jsPDF's built-in fonts can't render the emoji
  // codepoint directly so we pre-render it to a transparent PNG on
  // the client and embed it as an image.
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
  // Soft-truncate very long names to avoid wrapping into the QR.
  const nameMax = Math.floor(W / (headlineSize * 0.28))
  const printedName =
    args.campgroundName.length > nameMax
      ? args.campgroundName.slice(0, nameMax - 1).trim() + '…'
      : args.campgroundName
  doc.text(printedName, W / 2, yHeadline, { align: 'center' })

  // 3) White rounded card holding the QR — keeps quiet zone + scannability.
  const qrCardSize = Math.min(W - pad * 2, H * 0.5)
  const qrCardX = (W - qrCardSize) / 2
  const qrCardY = yHeadline + headlineSize * 0.6
  doc.setFillColor(255, 255, 255)
  // jsPDF's roundedRect uses style 'F' for fill.
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

  // 4) Headline caption directly under the QR card.
  doc.setFontSize(captionSize)
  doc.setTextColor(FLAME[0], FLAME[1], FLAME[2])
  const yCaption = qrCardY + qrCardSize + captionSize * 1.4
  doc.text('Staying here? Scan to check in with RoadWave.', W / 2, yCaption, { align: 'center' })

  // 5) Pitch + privacy reassurance in a tinted card.
  const pitchSize = safetySize * 1.15
  doc.setFontSize(pitchSize)
  const pitchMaxWidth = W - pad * 2 - 24
  const pitchLines = doc.splitTextToSize(FRONT_DESK_PITCH, pitchMaxWidth)
  const privacyLines = doc.splitTextToSize(FRONT_DESK_PRIVACY, pitchMaxWidth)
  const lineHeight = pitchSize * 1.35
  // pitch + gap + privacy + outer padding
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

  // 6) Compact compliance footer (18+ / emergencies) + brand line.
  doc.setFontSize(footerSize)
  doc.setTextColor(MIST[0], MIST[1], MIST[2])
  const yCompliance = H - pad * 1.4
  const complianceLines = doc.splitTextToSize(
    FRONT_DESK_COMPLIANCE,
    W - pad * 2,
  )
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
  // 👋 rasterised to a transparent PNG via the browser canvas + the
  // OS's color-emoji font. jsPDF's built-in helvetica can't render
  // emoji codepoints, so the wave next to the wordmark inside every
  // generated PDF gets embedded as this PNG image instead. Rendered
  // once on mount and reused across both PDF sizes.
  const [waveDataUrl, setWaveDataUrl] = useState<string | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  // Hoisted from the post-early-return slot so all hooks run on every
  // render (rules-of-hooks). The no-token branch lives in a separate
  // subcomponent so its state doesn't conflict either.
  const [pdfBusyFormat, setPdfBusyFormat] = useState<SignFormat | null>(null)
  const [state, formAction, pending] = useActionState(
    rotateQrTokenAction,
    initialState,
  )
  const downloadRef = useRef<HTMLAnchorElement | null>(null)

  async function handleCopyLink() {
    if (!checkInUrl) return
    try {
      await navigator.clipboard.writeText(checkInUrl)
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      setCopyState('error')
      window.setTimeout(() => setCopyState('idle'), 2500)
    }
  }

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

  // Pre-render the 👋 emoji to a transparent PNG once on mount so
  // buildBrandedQrPdf can embed it as part of the canonical RoadWave
  // wordmark. 192px is high enough that the PDF re-scaling down to
  // ~48pt looks crisp on print.
  useEffect(() => {
    setWaveDataUrl(renderEmojiToPng('👋', 192))
  }, [])

  // Pre-token state — owner can self-serve provisioning. Returning a
  // separate subcomponent here keeps the hooks order in OwnerQrPanel
  // unconditional (the call to setPdfBusyFormat / useState below
  // would otherwise live behind a conditional return, which trips
  // React's rules-of-hooks on token transitions).
  if (!token || !checkInUrl) {
    return <NoQrTokenCard campgroundId={campgroundId} />
  }

  const baseFilename = `${slug(campgroundName)}-roadwave-qr`

  async function downloadPdf(format: SignFormat) {
    if (!dataUrl || !checkInUrl) return
    setPdfBusyFormat(format)
    try {
      const blob = await buildBrandedQrPdf({
        qrDataUrl: dataUrl,
        waveDataUrl,
        campgroundName,
        format,
      })
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      const sizeTag = format === 'letter' ? '8.5x11' : '5x7'
      a.download = `${baseFilename}-${sizeTag}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'PDF render failed.'
      setRenderError(msg)
    } finally {
      setPdfBusyFormat(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/5 bg-card p-5 sm:p-6 space-y-4">
        {/* Inline scannable QR — large enough to scan straight off the
            screen from a phone, on a white card for camera contrast. */}
        <div className="mx-auto w-full max-w-sm aspect-square rounded-xl overflow-hidden bg-white grid place-items-center p-3">
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

        {/* Primary action row: Copy Link (sage), Download QR Code, Print
            Front Desk Card. Stack on phones, three-up on desktop. */}
        <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={!checkInUrl}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-leaf/40 bg-leaf/10 text-leaf px-4 py-2.5 text-sm font-semibold hover:bg-leaf/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {copyState === 'copied'
              ? '✓ Link copied'
              : copyState === 'error'
                ? 'Copy failed'
                : 'Copy Link'}
          </button>
          <a
            ref={downloadRef}
            href={dataUrl ?? '#'}
            download={`${baseFilename}.png`}
            aria-disabled={!dataUrl}
            className={
              dataUrl
                ? 'inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 text-cream px-4 py-2.5 text-sm font-semibold hover:bg-white/10 hover:border-flame/40 transition-colors'
                : 'inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 text-mist/50 px-4 py-2.5 text-sm font-semibold cursor-not-allowed'
            }
          >
            Download QR Code
          </a>
          <button
            type="button"
            onClick={() =>
              printFrontDeskCard(dataUrl, campgroundName, checkInUrl)
            }
            disabled={!dataUrl}
            className={
              dataUrl
                ? 'inline-flex items-center justify-center gap-2 rounded-lg bg-flame text-night px-4 py-2.5 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 transition-colors'
                : 'inline-flex items-center justify-center gap-2 rounded-lg bg-flame/50 text-night/50 px-4 py-2.5 text-sm font-semibold cursor-not-allowed'
            }
          >
            Print Front Desk Card
          </button>
        </div>

        {/* Secondary: pre-built PDF versions of the front-desk card. */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <p className="text-center text-[11px] uppercase tracking-[0.2em] text-mist">
            Print-ready signage PDF
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => downloadPdf('letter')}
              disabled={!dataUrl || pdfBusyFormat !== null}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-flame/40 bg-flame/10 text-flame px-4 py-2.5 text-sm font-semibold hover:bg-flame/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {pdfBusyFormat === 'letter' ? 'Building…' : 'Download 8.5 × 11'}
            </button>
            <button
              type="button"
              onClick={() => downloadPdf('5x7')}
              disabled={!dataUrl || pdfBusyFormat !== null}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-flame/40 bg-flame/10 text-flame px-4 py-2.5 text-sm font-semibold hover:bg-flame/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {pdfBusyFormat === '5x7' ? 'Building…' : 'Download 5 × 7'}
            </button>
          </div>
          <p className="text-center text-[11px] text-mist/70">
            Both sizes include the RoadWave brand, your QR, and the
            front-desk safety copy.
          </p>
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

    </div>
  )
}

// Pre-token state — campground exists but has no campground_qr_tokens
// row yet. Owner can self-serve provisioning. After successful insert
// the server action revalidates /owner/qr, the page re-renders with a
// real token, and the parent OwnerQrPanel takes over the normal
// rendered branch.
function NoQrTokenCard({ campgroundId }: { campgroundId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onGenerate() {
    setError(null)
    startTransition(async () => {
      const res = await generateQrTokenAction(campgroundId)
      if (!res.ok) setError(res.error ?? 'Could not generate a QR token.')
      // On success the server action calls revalidatePath('/owner/qr'),
      // so the page rerenders with the new token and this component
      // unmounts — nothing else to do here.
    })
  }

  return (
    <div className="rounded-2xl border border-flame/30 bg-card p-6 text-center space-y-3">
      <p className="font-display text-lg font-extrabold text-cream">
        Your QR code isn&apos;t set up yet
      </p>
      <p className="text-sm text-mist leading-relaxed max-w-md mx-auto">
        Generate a one-tap check-in QR for your front desk, welcome packet,
        or activity board. It only takes a second and you can rotate it
        anytime.
      </p>
      <div className="pt-1">
        <button
          type="button"
          onClick={onGenerate}
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-flame text-night px-5 py-2.5 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? 'Generating…' : 'Generate QR Code'}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-300 leading-snug">{error}</p>
      )}
      <p className="text-[11px] text-mist/70 leading-snug pt-1">
        Still stuck? Email{' '}
        <a
          href="mailto:hello@getroadwave.com"
          className="text-flame underline-offset-2 hover:underline"
        >
          hello@getroadwave.com
        </a>
        .
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

// Print a complete front-desk card — RoadWave wordmark, campground
// name, large QR on a white card, the three-line welcome/privacy
// copy, and a small compliance footer. Opens a new tab with a
// centered, brand-coloured page that auto-fires the print dialog and
// closes itself after print. Replaces the older "print QR only" path.
function printFrontDeskCard(
  dataUrl: string | null,
  campgroundName: string,
  checkInUrl: string | null,
): void {
  if (!dataUrl) return
  const w = window.open('', '_blank', 'noopener,noreferrer,width=620,height=900')
  if (!w) {
    window.location.href = dataUrl
    return
  }
  const safe = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  const safeName = safe(campgroundName)
  const safeUrl = checkInUrl ? safe(checkInUrl) : ''
  w.document.open()
  w.document.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>RoadWave front-desk card — ${safeName}</title>
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
    <div class="card"><img src="${dataUrl}" alt="RoadWave check-in QR" /></div>
    <p class="pitch">Staying here? Scan to check in with RoadWave.</p>
    <p class="desc">See campground updates, meetup prompts, and friendly nearby campers &mdash; only if you want to.</p>
    <p class="privacy">No exact site number. No always-on GPS. You control your visibility.</p>
    <p class="compliance">RoadWave is 18+. Meet in public campground areas. For emergencies call 911 and notify campground staff.</p>
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
