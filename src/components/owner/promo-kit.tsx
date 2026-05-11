'use client'

import { useEffect, useState } from 'react'
import {
  drawBrandWordmark,
  renderEmojiToPng,
} from '@/lib/owner/qr-card-brand'

// Promo Kit. Three downloadable, print-ready PDFs for any campground —
// each embedding the campground's unique QR code, the RoadWave wordmark,
// and the required tagline:
//
//   "Scan for campground updates, activities, and camper connection."
//
// The three formats are intentionally distinct from the marketing-kit
// assets (counter card / site card) so an owner has a single canonical
// "print these and post them" bundle for the dashboard.
//
//   1. QR Welcome Sign        — 8.5 × 11 portrait, for front gate or
//                                office window.
//   2. Front Desk Card        — 3.5 × 2 (business-card size), for the
//                                check-in counter.
//   3. Picnic Table Flyer     — 5.5 × 8.5 (half-letter), table tents
//                                and picnic-table notices.

const TAGLINE =
  'Scan for campground updates, activities, and camper connection.'

// Brand RGB tuples — match the project's tailwind theme tokens.
const NIGHT: [number, number, number] = [10, 15, 28] // #0a0f1c
const CARD: [number, number, number] = [17, 26, 46] // #111a2e
const CREAM: [number, number, number] = [245, 236, 217] // #f5ecd9
const FLAME: [number, number, number] = [245, 158, 11] // #f59e0b
const MIST: [number, number, number] = [148, 163, 184] // #94a3b8

type Format = 'welcome-sign' | 'desk-card' | 'picnic-flyer'

type FormatSpec = {
  id: Format
  // [width, height] in inches
  size: [number, number]
  label: string
  description: string
}

const FORMATS: FormatSpec[] = [
  {
    id: 'welcome-sign',
    size: [8.5, 11],
    label: 'QR Welcome Sign',
    description: '8.5 × 11 — front gate, office window, bulletin board.',
  },
  {
    id: 'desk-card',
    size: [3.5, 2],
    label: 'Front Desk Card',
    description: '3.5 × 2 — business-card size for the check-in counter.',
  },
  {
    id: 'picnic-flyer',
    size: [5.5, 8.5],
    label: 'Picnic Table Flyer',
    description: '5.5 × 8.5 — half-letter table tents and trail notices.',
  },
]

type Props = {
  campgroundName: string
  /** QR target URL — null when a token hasn't been provisioned yet. */
  checkInUrl: string | null
}

export function PromoKit({ campgroundName, checkInUrl }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  // 👋 rasterised to a transparent PNG via the OS color-emoji font;
  // see qr-card-brand.ts for why jsPDF needs the image rather than
  // the codepoint.
  const [waveDataUrl, setWaveDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<Format | null>(null)

  // Pre-render the QR once and re-use across every PDF format.
  useEffect(() => {
    if (!checkInUrl) {
      setQrDataUrl(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const QR = await import('qrcode')
        const url = await QR.toDataURL(checkInUrl, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 1000,
          color: { dark: '#0a0f1c', light: '#ffffff' },
        })
        if (!cancelled) setQrDataUrl(url)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not render QR.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [checkInUrl])

  // Pre-render the 👋 emoji to a transparent PNG once on mount so
  // each promo PDF can embed it as part of the canonical wordmark.
  useEffect(() => {
    setWaveDataUrl(renderEmojiToPng('👋', 192))
  }, [])

  async function download(format: FormatSpec) {
    if (!qrDataUrl) return
    setBusy(format.id)
    try {
      const blob = await buildPdf({
        qrDataUrl,
        waveDataUrl,
        campgroundName,
        format,
      })
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `${slug(campgroundName)}-${format.id}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF build failed.')
    } finally {
      setBusy(null)
    }
  }

  if (!checkInUrl) {
    return (
      <section className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-mist">
          Promo kit
        </p>
        <div className="rounded-2xl border border-dashed border-white/10 bg-card p-5 text-center text-sm text-mist">
          We&apos;ll generate your promo kit once your campground&apos;s QR
          token is provisioned.
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame">
          Promo kit
        </p>
        <p className="text-sm text-mist leading-snug">
          Print-ready PDFs with your QR code, the RoadWave logo, and the
          official tagline.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => download(f)}
            disabled={!qrDataUrl || busy !== null}
            className="text-left rounded-2xl border border-white/5 bg-card p-4 hover:border-flame/40 hover:bg-card/80 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <p className="font-semibold text-cream">{f.label}</p>
            <p className="mt-0.5 text-xs text-mist leading-snug">
              {f.description}
            </p>
            <p className="mt-2 text-[11px] font-semibold text-flame">
              {busy === f.id ? 'Building…' : 'Download PDF →'}
            </p>
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </section>
  )
}

// ---------------------------------------------------------------------------
// PDF builders
// ---------------------------------------------------------------------------

async function buildPdf(args: {
  qrDataUrl: string
  /** Pre-rasterised 👋 PNG; pass null to fall back to text-only wordmark. */
  waveDataUrl: string | null
  campgroundName: string
  format: FormatSpec
}): Promise<Blob> {
  const { default: JsPDF } = await import('jspdf')
  const [wIn, hIn] = args.format.size
  // jsPDF dimensions: pt = 72 / in.
  const W = wIn * 72
  const H = hIn * 72

  const doc = new JsPDF({
    unit: 'pt',
    format: [W, H],
    orientation: wIn >= hIn ? 'landscape' : 'portrait',
  })

  // Background — solid night, full bleed.
  doc.setFillColor(NIGHT[0], NIGHT[1], NIGHT[2])
  doc.rect(0, 0, W, H, 'F')

  if (args.format.id === 'desk-card') {
    drawDeskCard(doc, W, H, args.qrDataUrl, args.waveDataUrl, args.campgroundName)
  } else {
    drawPoster(doc, W, H, args.qrDataUrl, args.waveDataUrl, args.campgroundName)
  }

  return doc.output('blob')
}

// Generic poster layout — used by the 8.5×11 Welcome Sign and the 5.5×8.5
// Picnic Table Flyer. Same hierarchy at both sizes; everything scales
// from page width so layouts stay visually coherent.
function drawPoster(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- jsPDF types live behind a dynamic import
  doc: any,
  W: number,
  H: number,
  qrDataUrl: string,
  waveDataUrl: string | null,
  campgroundName: string,
) {
  const pad = W * 0.07
  const wordmarkSize = W * 0.08
  const eyebrowSize = W * 0.022
  const headlineSize = W * 0.05
  const taglineSize = W * 0.026
  const footerSize = W * 0.02

  // 1) Eyebrow ("Welcome to") in amber.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(eyebrowSize)
  doc.setTextColor(FLAME[0], FLAME[1], FLAME[2])
  const yEyebrow = pad + eyebrowSize
  doc.text('WELCOME TO', W / 2, yEyebrow, { align: 'center' })

  // 2) Campground name headline.
  doc.setFontSize(headlineSize)
  doc.setTextColor(CREAM[0], CREAM[1], CREAM[2])
  const yHeadline = yEyebrow + headlineSize * 1.05
  const nameMax = Math.floor(W / (headlineSize * 0.28))
  const printedName =
    campgroundName.length > nameMax
      ? campgroundName.slice(0, nameMax - 1).trim() + '…'
      : campgroundName
  doc.text(printedName, W / 2, yHeadline, { align: 'center' })

  // 3) Canonical RoadWave wordmark below the name — cream Road,
  // flame Wave, 👋 PNG flush against Wave.
  const yWordmark = yHeadline + wordmarkSize * 1.1
  drawBrandWordmark({
    doc,
    fontSize: wordmarkSize,
    waveDataUrl,
    y: yWordmark,
    align: 'center',
    x: W / 2,
  })

  // 4) QR card.
  const qrCardSize = Math.min(W - pad * 2, H * 0.5)
  const qrCardX = (W - qrCardSize) / 2
  const qrCardY = yWordmark + wordmarkSize * 0.45
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(qrCardX, qrCardY, qrCardSize, qrCardSize, 14, 14, 'F')
  const qrInset = qrCardSize * 0.07
  doc.addImage(
    qrDataUrl,
    'PNG',
    qrCardX + qrInset,
    qrCardY + qrInset,
    qrCardSize - qrInset * 2,
    qrCardSize - qrInset * 2,
  )

  // 5) Tagline (verbatim per spec).
  doc.setFontSize(taglineSize)
  doc.setTextColor(CREAM[0], CREAM[1], CREAM[2])
  const yTagline = qrCardY + qrCardSize + taglineSize * 1.7
  const taglineLines = doc.splitTextToSize(TAGLINE, W - pad * 2)
  const taglineLineHeight = taglineSize * 1.35
  doc.text(taglineLines, W / 2, yTagline, {
    align: 'center',
    maxWidth: W - pad * 2,
  })

  // 6) Footer URL.
  doc.setFontSize(footerSize)
  doc.setTextColor(MIST[0], MIST[1], MIST[2])
  doc.text('getroadwave.com', W / 2, H - pad * 0.5, { align: 'center' })

  // Suppress unused warnings for layout helpers.
  void taglineLineHeight
}

// Business-card layout — landscape orientation, QR on the left, brand
// + name + tagline stacked on the right.
function drawDeskCard(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- jsPDF types live behind a dynamic import
  doc: any,
  W: number,
  H: number,
  qrDataUrl: string,
  waveDataUrl: string | null,
  campgroundName: string,
) {
  const pad = H * 0.08

  // QR card on the left (square, max-out height).
  const qrSize = H - pad * 2
  const qrX = pad
  const qrY = pad
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(qrX, qrY, qrSize, qrSize, 6, 6, 'F')
  const qrInset = qrSize * 0.07
  doc.addImage(
    qrDataUrl,
    'PNG',
    qrX + qrInset,
    qrY + qrInset,
    qrSize - qrInset * 2,
    qrSize - qrInset * 2,
  )

  // Right-side text column.
  const textX = qrX + qrSize + pad * 0.8
  const textW = W - textX - pad

  // Canonical RoadWave wordmark, left-aligned to the text column.
  const wordmarkSize = H * 0.13
  let y = pad + wordmarkSize
  drawBrandWordmark({
    doc,
    fontSize: wordmarkSize,
    waveDataUrl,
    y,
    align: 'left',
    x: textX,
  })

  // Campground name (truncated to fit the right column).
  const nameSize = H * 0.075
  y += nameSize * 1.5
  doc.setFontSize(nameSize)
  doc.setTextColor(CREAM[0], CREAM[1], CREAM[2])
  const nameMax = Math.floor(textW / (nameSize * 0.4))
  const printedName =
    campgroundName.length > nameMax
      ? campgroundName.slice(0, nameMax - 1).trim() + '…'
      : campgroundName
  doc.text(printedName, textX, y)

  // Tagline.
  const taglineSize = H * 0.055
  y += taglineSize * 1.3
  doc.setFontSize(taglineSize)
  doc.setTextColor(MIST[0], MIST[1], MIST[2])
  const taglineLines = doc.splitTextToSize(TAGLINE, textW)
  doc.text(taglineLines, textX, y, { maxWidth: textW })

  // Tagline can spill below the QR on a card this small; rely on the
  // textW maxWidth + the natural 3-line wrap.

  // Side accent stripe — amber bar on the left edge of the QR card to
  // tie back to the brand palette.
  doc.setFillColor(FLAME[0], FLAME[1], FLAME[2])
  doc.rect(0, 0, 3, H, 'F')

  // Quiet card bg accent so the right column doesn't look bare.
  void CARD
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
