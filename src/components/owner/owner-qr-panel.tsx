'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import {
  rotateQrTokenAction,
  type RotateState,
} from '@/app/owner/(authed)/qr/actions'

// Brand colors — kept in sync with tailwind theme tokens.
const NIGHT: [number, number, number] = [10, 15, 28] // #0a0f1c
const CARD: [number, number, number] = [17, 26, 46] // #111a2e
const CREAM: [number, number, number] = [245, 236, 217] // #f5ecd9
const FLAME: [number, number, number] = [245, 158, 11] // #f59e0b
const MIST: [number, number, number] = [148, 163, 184] // #94a3b8

// Verbatim safety paragraph required on every printed sign.
const SAFETY_TEXT =
  'Meet nearby campers — only if you want to. RoadWave is an optional 18+ guest connection tool. Exact campsite numbers are not shown. Meet in public campground areas. For emergencies call 911 and notify campground staff.'

type SignFormat = 'letter' | '5x7'

// Builds a print-ready, dark-navy-themed signage PDF at the requested size.
// Layout scales from the page width: same hierarchy at 5×7 and 8.5×11.
async function buildBrandedQrPdf(args: {
  qrDataUrl: string
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

  // 1) RoadWave wordmark — two-tone "Road" (cream) + "Wave" (amber).
  // jsPDF's default WinAnsi fonts don't include emoji, so the wave glyph
  // is omitted in print to keep this rendering reliably across viewers.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(wordmarkSize)
  const yWordmark = pad + wordmarkSize
  const roadWidth = doc.getTextWidth('Road')
  const waveWidth = doc.getTextWidth('Wave')
  const wordmarkTotal = roadWidth + waveWidth
  const wordmarkStart = (W - wordmarkTotal) / 2
  doc.setTextColor(CREAM[0], CREAM[1], CREAM[2])
  doc.text('Road', wordmarkStart, yWordmark)
  doc.setTextColor(FLAME[0], FLAME[1], FLAME[2])
  doc.text('Wave', wordmarkStart + roadWidth, yWordmark)

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

  // 4) Caption directly under the QR card.
  doc.setFontSize(captionSize)
  doc.setTextColor(FLAME[0], FLAME[1], FLAME[2])
  const yCaption = qrCardY + qrCardSize + captionSize * 1.4
  doc.text('Scan for campground updates and connect privately', W / 2, yCaption, { align: 'center' })

  // 5) Safety paragraph in a tinted card — wrapped to width.
  doc.setFontSize(safetySize)
  doc.setTextColor(MIST[0], MIST[1], MIST[2])
  const safetyMaxWidth = W - pad * 2 - 24
  const safetyLines = doc.splitTextToSize(SAFETY_TEXT, safetyMaxWidth)
  const safetyLineHeight = safetySize * 1.35
  const safetyHeight = safetyLines.length * safetyLineHeight + 18

  const ySafetyBox = yCaption + captionSize * 1.1
  const safetyBoxW = W - pad * 2
  const safetyBoxX = pad
  doc.setFillColor(CARD[0], CARD[1], CARD[2])
  doc.roundedRect(safetyBoxX, ySafetyBox, safetyBoxW, safetyHeight, 10, 10, 'F')
  doc.setFontSize(safetySize)
  doc.setTextColor(MIST[0], MIST[1], MIST[2])
  doc.text(safetyLines, W / 2, ySafetyBox + safetyLineHeight, {
    align: 'center',
    maxWidth: safetyMaxWidth,
  })

  // 6) Footer — getroadwave.com.
  doc.setFontSize(footerSize)
  doc.setTextColor(MIST[0], MIST[1], MIST[2])
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
          href="mailto:hello@getroadwave.com"
          className="text-flame underline-offset-2 hover:underline"
        >
          Email us
        </a>{' '}
        and we&apos;ll provision one.
      </div>
    )
  }

  const baseFilename = `${slug(campgroundName)}-roadwave-qr`
  const [pdfBusyFormat, setPdfBusyFormat] = useState<SignFormat | null>(null)

  async function downloadPdf(format: SignFormat) {
    if (!dataUrl || !checkInUrl) return
    setPdfBusyFormat(format)
    try {
      const blob = await buildBrandedQrPdf({
        qrDataUrl: dataUrl,
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

        <div className="space-y-2">
          <p className="text-center text-[11px] uppercase tracking-[0.2em] text-mist">
            Print-ready signage
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => downloadPdf('letter')}
              disabled={!dataUrl || pdfBusyFormat !== null}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-flame text-night px-4 py-2.5 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            Both sizes include the RoadWave brand, your QR, and the required
            safety language.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
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
            Download PNG (QR only)
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
