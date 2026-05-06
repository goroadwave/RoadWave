'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { splitAmenities } from '@/lib/campgrounds/amenities'

// Owner-facing Marketing Kit. Generates every brand-correct, auto-
// populated promotional asset on demand: PDFs are built client-side
// with jsPDF, the QR PNG is rendered with the qrcode lib, and the
// email assets are HTML/plain-text snippets the owner copies and
// pastes. All assets pull the campground's name, location, logo, and
// QR-token check-in URL through the props this component receives —
// nothing is hardcoded.
//
// Spec colors (per owner brief — slightly different from the global
// flame/leaf tokens used elsewhere on the site, intentionally so):
//   bg navy   #111827
//   amber     #F5A623
//   green     #4BAE82
//   night-fg  #0a0f1c (used for text-on-amber to match the marketing
//                     site's bg-flame/text-night primary button rule)

const BRAND = {
  navy: [0x11, 0x18, 0x27] as const,
  amber: [0xf5, 0xa6, 0x23] as const,
  green: [0x4b, 0xae, 0x82] as const,
  white: [0xff, 0xff, 0xff] as const,
  cream: [0xf5, 0xec, 0xd9] as const,
  mist: [0x94, 0xa3, 0xb8] as const,
  night: [0x0a, 0x0f, 0x1c] as const,
}

const TAGLINE =
  'See campground updates, activities, and wave hello — only if you want.'

const COUNTER_BULLETS: string[] = [
  'No app download needed',
  'No exact site numbers — ever',
  'No public group chats',
  'You control your visibility',
  'Free for all guests',
]

const FOOTER_PRIVACY_LINE =
  'Private by design. No exact site numbers. No public group chats. No pressure.'

type Props = {
  campgroundName: string
  location: string
  logoUrl: string | null
  slug: string
  siteUrl: string
  checkInUrl: string | null
  /** Saved campgrounds.amenities (mix of standard labels and custom).
   *  Embedded into the printable Counter Card and Site Card PDFs as a
   *  small pill row — solid border for standard, dashed for custom. */
  amenities: string[]
}

export function MarketingKit({
  campgroundName,
  location,
  logoUrl,
  slug,
  siteUrl,
  checkInUrl,
  amenities,
}: Props) {
  const [qrPngDataUrl, setQrPngDataUrl] = useState<string | null>(null)
  // 👋 rasterised to a PNG via the browser canvas + system emoji font.
  // jsPDF's built-in fonts can't render emoji glyphs, so the wave next
  // to the RoadWave wordmark inside every PDF goes in as an embedded
  // image instead. Generated once on mount and reused across every
  // PDF download.
  const [waveDataUrl, setWaveDataUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  const copyResetTimer = useRef<number | null>(null)

  // Pre-render a single high-res QR PNG and reuse it across every asset
  // (PDFs embed it, the email blocks reference it as a base64 data URL,
  // and the standalone "Download QR PNG" button serves it directly).
  useEffect(() => {
    if (!checkInUrl) {
      setQrPngDataUrl(null)
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
          color: { dark: '#111827', light: '#ffffff' },
        })
        if (!cancelled) setQrPngDataUrl(url)
      } catch (err) {
        if (!cancelled) {
          setRenderError(
            err instanceof Error ? err.message : 'Could not render QR.',
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [checkInUrl])

  // Pre-render the 👋 emoji to a transparent PNG once on mount. Each
  // OS/browser uses its own color emoji font (Apple Color Emoji on
  // macOS/iOS, Segoe UI Emoji on Windows, Noto Color Emoji on Android/
  // Linux), so the look matches what the owner sees in their own
  // system everywhere else.
  useEffect(() => {
    setWaveDataUrl(renderEmojiToPng('👋', 192))
  }, [])

  function flashCopied(label: string) {
    setCopied(label)
    if (copyResetTimer.current) window.clearTimeout(copyResetTimer.current)
    copyResetTimer.current = window.setTimeout(() => setCopied(null), 2_000)
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }

  function downloadDataUrl(dataUrl: string, filename: string) {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  // ----------------------------------------------------------------
  // Empty-state guards
  // ----------------------------------------------------------------

  if (!checkInUrl) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-card p-6 text-center text-sm text-mist">
        No QR token has been issued for your campground yet.{' '}
        <a
          href="mailto:hello@getroadwave.com"
          className="text-flame underline-offset-2 hover:underline"
        >
          Email us
        </a>{' '}
        and we&apos;ll provision one — every marketing asset depends on
        it.
      </div>
    )
  }

  const baseFilename = slugify(campgroundName) || 'campground'

  // ----------------------------------------------------------------
  // Asset triggers
  // ----------------------------------------------------------------

  async function downloadCounterCard() {
    if (!qrPngDataUrl) return
    setBusy('counter')
    try {
      const blob = await buildCounterCardPdf({
        qrDataUrl: qrPngDataUrl,
        waveDataUrl,
        campgroundName,
        location,
        amenities,
      })
      downloadBlob(blob, `${baseFilename}-counter-card-4x6.pdf`)
    } catch (e) {
      setRenderError(e instanceof Error ? e.message : 'PDF build failed.')
    } finally {
      setBusy(null)
    }
  }

  async function downloadQrPdf() {
    if (!qrPngDataUrl) return
    setBusy('qr-pdf')
    try {
      const blob = await buildSimpleQrPdf({
        qrDataUrl: qrPngDataUrl,
        waveDataUrl,
        campgroundName,
      })
      downloadBlob(blob, `${baseFilename}-qr-print.pdf`)
    } catch (e) {
      setRenderError(e instanceof Error ? e.message : 'PDF build failed.')
    } finally {
      setBusy(null)
    }
  }

  async function downloadSiteCard() {
    if (!qrPngDataUrl) return
    setBusy('site-card')
    try {
      const blob = await buildSiteCardPdf({
        qrDataUrl: qrPngDataUrl,
        waveDataUrl,
        campgroundName,
        location,
        amenities,
      })
      downloadBlob(blob, `${baseFilename}-site-card-4x9.pdf`)
    } catch (e) {
      setRenderError(e instanceof Error ? e.message : 'PDF build failed.')
    } finally {
      setBusy(null)
    }
  }

  function downloadQrPng() {
    if (!qrPngDataUrl) return
    downloadDataUrl(qrPngDataUrl, `${baseFilename}-qr-1000.png`)
  }

  // The clean, shareable campground welcome URL — the canonical place
  // for guests to land when an owner sends a link in email or pastes
  // their signature into Gmail. No token query: tokens are for
  // QR-scan validation; the welcome page picks up the active token
  // from the DB on its own when one isn't in the URL.
  const campgroundPageUrl = `${siteUrl}/campground/${slug}`

  async function copyEmailSignature() {
    if (!qrPngDataUrl) return
    const html = buildEmailSignatureHtml({
      qrDataUrl: qrPngDataUrl,
      campgroundName,
      campgroundUrl: campgroundPageUrl,
    })
    const plain = `Scan to connect with fellow campers at ${campgroundName} — ${campgroundPageUrl}`
    await copyHtmlToClipboard(html, plain)
    flashCopied('signature')
  }

  async function copyWelcomeEmailHtml() {
    if (!qrPngDataUrl) return
    const html = buildWelcomeEmailHtml({
      qrDataUrl: qrPngDataUrl,
      campgroundName,
      campgroundUrl: campgroundPageUrl,
    })
    // Plain-text clipboard companion. MUST use campgroundPageUrl (no
    // token) — the previous version passed checkInUrl, which carries
    // ?token=…, and that token URL was leaking into clipboard pastes
    // that landed on the text/plain MIME type instead of text/html.
    const plain = buildWelcomeEmailText({
      campgroundName,
      campgroundUrl: campgroundPageUrl,
    })
    await copyHtmlToClipboard(html, plain)
    flashCopied('welcome-html')
  }

  async function copyWelcomeEmailText() {
    // Plain-text version's URL has no token either — the welcome page
    // looks up the active token from the DB on its own.
    const plain = buildWelcomeEmailText({
      campgroundName,
      campgroundUrl: campgroundPageUrl,
    })
    await navigator.clipboard.writeText(plain)
    flashCopied('welcome-text')
  }

  // ----------------------------------------------------------------
  // UI
  // ----------------------------------------------------------------

  const qrReady = qrPngDataUrl !== null

  return (
    <div className="space-y-5">
      {!logoUrl && (
        <div className="rounded-xl border border-flame/30 bg-flame/[0.06] px-4 py-3 text-sm text-cream/95 flex items-start gap-3">
          <span className="text-flame text-base mt-0.5" aria-hidden>
            ⚠
          </span>
          <span className="leading-relaxed">
            Upload your logo in{' '}
            <Link
              href="/owner/profile"
              className="font-semibold text-flame underline-offset-2 hover:underline"
            >
              Profile
            </Link>{' '}
            to include it in your marketing materials.
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Asset
          title="Counter Card — 4×6 PDF"
          description="Print-ready 4×6 card with your logo, name, location, and QR. Designed for the front desk or check-in counter."
          where="Front desk · check-in counter · welcome packet"
          actions={
            <PrimaryButton
              onClick={downloadCounterCard}
              disabled={!qrReady || busy === 'counter'}
              loading={busy === 'counter'}
            >
              Download Counter Card PDF
            </PrimaryButton>
          }
          preview={qrPngDataUrl && <QrThumb dataUrl={qrPngDataUrl} />}
        />

        <Asset
          title="QR Code — High Resolution PNG"
          description="1000×1000px PNG of your unique QR. White background, no text — drop it into anything."
          where="Use anywhere — signs, flyers, welcome packets, social media"
          actions={
            <PrimaryButton onClick={downloadQrPng} disabled={!qrReady}>
              Download QR PNG (1000×1000)
            </PrimaryButton>
          }
          preview={qrPngDataUrl && <QrThumb dataUrl={qrPngDataUrl} />}
        />

        <Asset
          title="QR Code — Print Ready PDF"
          description="Single page, centered QR with a Scan to Check In label and your campground name below."
          where="Quick prints · noticeboards · printer-only office setups"
          actions={
            <PrimaryButton
              onClick={downloadQrPdf}
              disabled={!qrReady || busy === 'qr-pdf'}
              loading={busy === 'qr-pdf'}
            >
              Download QR PDF
            </PrimaryButton>
          }
          preview={qrPngDataUrl && <QrThumb dataUrl={qrPngDataUrl} />}
        />

        <Asset
          title="Email Signature — Paste into Gmail or Outlook"
          description="HTML snippet with the RoadWave wordmark, your campground line, your QR, and a link to your campground page."
          where="Gmail · Outlook · Apple Mail · any email client"
          actions={
            <PrimaryButton
              onClick={copyEmailSignature}
              disabled={!qrReady}
            >
              {copied === 'signature' ? 'Copied ✓' : 'Copy HTML'}
            </PrimaryButton>
          }
          preview={
            qrPngDataUrl && (
              <SignaturePreview
                qrDataUrl={qrPngDataUrl}
                campgroundName={campgroundName}
                campgroundUrl={campgroundPageUrl}
              />
            )
          }
        />

        <Asset
          title="Guest Welcome Email — Copy & Paste"
          description="Pre-written welcome email already personalised for your campground. Paste the HTML version into a rich-email client, or the plain-text version anywhere."
          where="Reservation confirmations · pre-arrival emails · Mailchimp / Klaviyo blasts"
          actions={
            <div className="flex flex-col sm:flex-row gap-2">
              <PrimaryButton
                onClick={copyWelcomeEmailHtml}
                disabled={!qrReady}
              >
                {copied === 'welcome-html'
                  ? 'Copied ✓'
                  : 'Copy HTML version'}
              </PrimaryButton>
              <SecondaryButton onClick={copyWelcomeEmailText}>
                {copied === 'welcome-text'
                  ? 'Copied ✓'
                  : 'Copy plain text'}
              </SecondaryButton>
            </div>
          }
          preview={
            <p className="text-xs text-mist leading-relaxed bg-night/40 rounded-lg p-3 border border-white/5">
              Welcome to <span className="text-cream">{campgroundName}</span>
              ! We use RoadWave so our guests can see campground updates,
              find activities, and optionally connect with fellow campers
              — privately and without sharing exact site numbers…
            </p>
          }
        />

        <Asset
          title="Site Card — Print for Individual Sites"
          description="4×9 print format for individual campsites or cabin doors. Same dark navy branding, your QR, name, and the amber/green CTA labels."
          where="Cabin doors · post stakes · door hangers · in-site welcome cards"
          actions={
            <PrimaryButton
              onClick={downloadSiteCard}
              disabled={!qrReady || busy === 'site-card'}
              loading={busy === 'site-card'}
            >
              Download Site Card PDF
            </PrimaryButton>
          }
          preview={qrPngDataUrl && <QrThumb dataUrl={qrPngDataUrl} />}
        />
      </div>

      {renderError && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {renderError}
        </p>
      )}

      <p className="text-[11px] text-mist/70 leading-snug">
        All assets are generated locally in your browser from your
        campground&rsquo;s data — name, location, logo, and the active QR
        token. Regenerate the QR token under{' '}
        <Link
          href="/owner/qr"
          className="text-flame underline-offset-2 hover:underline"
        >
          QR
        </Link>{' '}
        to invalidate every printed and emailed asset.
      </p>

      {/* Hidden site URL anchor used by the welcome-email plain-text
          fallback so the campground page link stays in sync without
          re-templating. */}
      <a className="sr-only" href={`${siteUrl}/campground/${slug}`}>
        Campground page
      </a>
    </div>
  )
}

// ----------------------------------------------------------------
// Card UI primitives
// ----------------------------------------------------------------

function Asset(props: {
  title: string
  description: string
  where: string
  actions: React.ReactNode
  preview?: React.ReactNode
}) {
  return (
    <article className="rounded-2xl border border-white/5 bg-card p-4 sm:p-5 space-y-3 flex flex-col">
      <header className="space-y-1">
        <h3 className="font-semibold text-cream text-sm sm:text-base">
          {props.title}
        </h3>
        <p className="text-xs sm:text-sm text-mist leading-relaxed">
          {props.description}
        </p>
      </header>
      {props.preview && <div className="pt-1">{props.preview}</div>}
      <p className="text-[11px] uppercase tracking-[0.14em] text-flame font-semibold">
        {props.where}
      </p>
      <div className="pt-1 mt-auto">{props.actions}</div>
    </article>
  )
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  loading,
}: {
  children: React.ReactNode
  onClick: () => void | Promise<void>
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-flame text-night px-4 py-2.5 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? 'Building…' : children}
    </button>
  )
}

function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void | Promise<void>
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-flame/40 bg-flame/10 text-flame px-4 py-2.5 text-sm font-semibold hover:bg-flame/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  )
}

function QrThumb({ dataUrl }: { dataUrl: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- inline data URL
    <img
      src={dataUrl}
      alt=""
      className="h-20 w-20 rounded-md bg-white p-1"
    />
  )
}

function SignaturePreview({
  qrDataUrl,
  campgroundName,
  campgroundUrl,
}: {
  qrDataUrl: string
  campgroundName: string
  campgroundUrl: string
}) {
  // Mirrors the same anchor structure the copied HTML signature uses:
  // QR image is wrapped in a clickable <a>, the URL never appears as
  // raw text — Gmail's plain-text fallback heuristic was kicking in
  // when the visible URL got pasted as text and indexing it as a
  // search query instead of a hyperlink.
  return (
    <div className="rounded-lg bg-white text-night p-3 text-[11px] flex items-center gap-3">
      <a
        href={campgroundUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block shrink-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt={`${campgroundName} check-in QR`} className="h-12 w-12" />
      </a>
      <div>
        <p className="font-bold">
          Road<span className="text-amber-500">Wave</span>{' '}
          <span aria-hidden>👋</span>
        </p>
        <p>
          Scan to connect with fellow campers at{' '}
          <span className="font-semibold">{campgroundName}</span>
        </p>
        <p>
          <a
            href={campgroundUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F5A623', fontWeight: 600 }}
          >
            View our campground page →
          </a>
        </p>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Asset builders
// ----------------------------------------------------------------

type CardArgs = {
  qrDataUrl: string
  waveDataUrl: string | null
  campgroundName: string
  location: string
  amenities: string[]
}

// Render a horizontal row of amenity pills centered at `centerX, y`.
// Solid amber border for standard amenities, dashed amber border for
// custom (matches the welcome page's solid-vs-dashed treatment).
// Packs left-to-right and silently drops any that won't fit within
// `maxWidth`. The full list lives on the welcome page; the PDFs are
// constrained real estate so we just surface what fits.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- jsPDF
function drawAmenityRow(
  doc: any,
  amenities: string[],
  centerX: number,
  y: number,
  maxWidth: number,
) {
  if (amenities.length === 0) return
  // Standard amenities first so the most recognisable labels (Pool,
  // WiFi, Dog-Friendly, etc.) appear before owner-typed customs.
  const { standard, custom } = splitAmenities(amenities)
  const ordered: { text: string; isStandard: boolean }[] = [
    ...standard.map((t) => ({ text: t, isStandard: true })),
    ...custom.map((t) => ({ text: t, isStandard: false })),
  ]

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  const padX = 6
  const pillH = 13
  const gap = 4

  const measured = ordered.map((m) => ({
    ...m,
    label: m.text.toUpperCase(),
    width: doc.getTextWidth(m.text.toUpperCase()) + padX * 2,
  }))

  // Pack left-to-right.
  const fit: typeof measured = []
  let total = 0
  for (const m of measured) {
    const inc = (fit.length === 0 ? 0 : gap) + m.width
    if (total + inc > maxWidth) break
    fit.push(m)
    total += inc
  }
  if (fit.length === 0) return

  let startX = centerX - total / 2
  for (const m of fit) {
    drawAmenityPill(doc, m.label, startX, y, m.width, pillH, m.isStandard)
    startX += m.width + gap
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- jsPDF
function drawAmenityPill(
  doc: any,
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
  isStandard: boolean,
) {
  doc.setLineWidth(0.6)
  // jsPDF v2+ exposes setLineDashPattern; older builds expose
  // setLineDash. Try both so this doesn't blow up if the bundled
  // version drifts.
  if (!isStandard) {
    if (typeof doc.setLineDashPattern === 'function') {
      doc.setLineDashPattern([2, 2], 0)
    } else if (typeof doc.setLineDash === 'function') {
      doc.setLineDash([2, 2], 0)
    }
  }
  // Border + faint amber fill for standards; transparent fill +
  // dashed border for customs.
  doc.setDrawColor(BRAND.amber[0], BRAND.amber[1], BRAND.amber[2])
  if (isStandard) {
    // Approximate the welcome page's amber/[0.06] with a near-navy
    // tinted fill so the pill reads "filled" without overpowering.
    doc.setFillColor(0x2a, 0x20, 0x10)
    doc.roundedRect(x, y, w, h, 3, 3, 'FD')
  } else {
    doc.roundedRect(x, y, w, h, 3, 3, 'S')
  }
  // Reset dash pattern so it doesn't leak into subsequent draws.
  if (typeof doc.setLineDashPattern === 'function') {
    doc.setLineDashPattern([], 0)
  } else if (typeof doc.setLineDash === 'function') {
    doc.setLineDash([], 0)
  }
  setText(doc, BRAND.amber)
  doc.text(label, x + w / 2, y + 9, { align: 'center' })
}

// 4×6 portrait, 288×432pt. Matches the spec layout: brand wordmark
// top-left, "WELCOME TO" + name + location, two-column QR + bullet
// area, two pill CTAs, dark footer with privacy line + green pill.
async function buildCounterCardPdf(args: CardArgs): Promise<Blob> {
  const { default: JsPDF } = await import('jspdf')
  const doc = new JsPDF({
    unit: 'pt',
    format: [288, 432],
    orientation: 'portrait',
  })
  const W = 288
  const H = 432
  const PAD = 16

  // Background
  setFill(doc, BRAND.navy)
  doc.rect(0, 0, W, H, 'F')

  // Top-left wordmark — Road white, Wave amber. The 👋 to the right of
  // the wordmark is drawn separately as an embedded PNG (rasterised on
  // the client from the system emoji font); jsPDF's built-in
  // helvetica/courier/times fonts have no emoji glyphs, so embedding
  // the rendered image is the only way to get a recognisable wave on
  // the PDF.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  setText(doc, BRAND.white)
  doc.text('Road', PAD, PAD + 18)
  const roadW = doc.getTextWidth('Road')
  setText(doc, BRAND.amber)
  doc.text('Wave', PAD + roadW, PAD + 18)
  const waveW = doc.getTextWidth('Wave')
  if (args.waveDataUrl) {
    const waveSize = 22
    doc.addImage(
      args.waveDataUrl,
      'PNG',
      PAD + roadW + waveW + 5,
      PAD - 1,
      waveSize,
      waveSize,
    )
  }

  // "WELCOME TO" eyebrow
  doc.setFontSize(8)
  setText(doc, BRAND.amber)
  doc.text('WELCOME TO', PAD, PAD + 50)

  // Campground name (wrap if long)
  doc.setFontSize(20)
  setText(doc, BRAND.white)
  const nameLines = doc.splitTextToSize(args.campgroundName, W - PAD * 2)
  let nameY = PAD + 72
  doc.text(nameLines, PAD, nameY)
  nameY += nameLines.length * 22

  // Location
  if (args.location) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    setText(doc, BRAND.mist)
    doc.text(args.location, PAD, nameY + 4)
  }

  // Two-column QR + bullets
  const qrSize = 110
  const qrX = PAD
  const qrY = 168
  // White QR card with rounded corners
  setFill(doc, BRAND.white)
  doc.roundedRect(qrX, qrY, qrSize, qrSize, 6, 6, 'F')
  const inset = 6
  doc.addImage(
    args.qrDataUrl,
    'PNG',
    qrX + inset,
    qrY + inset,
    qrSize - inset * 2,
    qrSize - inset * 2,
  )

  // QR labels — above + below
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  setText(doc, BRAND.amber)
  doc.text('OPEN CAMERA & SCAN', qrX + qrSize / 2, qrY - 6, {
    align: 'center',
  })
  doc.text('SCAN TO CHECK IN', qrX + qrSize / 2, qrY + qrSize + 12, {
    align: 'center',
  })

  // Right column — italic tagline + bullets
  const rightX = qrX + qrSize + 16
  const rightW = W - rightX - PAD

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  setText(doc, BRAND.amber)
  const taglineLines = doc.splitTextToSize(TAGLINE, rightW)
  doc.text(taglineLines, rightX, qrY + 8)

  // Bullets
  let by = qrY + 8 + taglineLines.length * 12 + 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  for (const b of COUNTER_BULLETS) {
    setText(doc, BRAND.green)
    doc.text('✓', rightX, by)
    setText(doc, BRAND.white)
    doc.text(b, rightX + 10, by)
    by += 12
  }

  // Action pills row
  const pillsY = qrY + qrSize + 36
  const pillGap = 8
  const pillW = (W - PAD * 2 - pillGap) / 2
  const pillH = 26

  // Amber: Check In & Connect with Campers. The label is wide for the
  // 124pt pill at 8pt helvetica-bold (clipped on the left edge), so we
  // size both pill labels at 7pt for guaranteed fit.
  setFill(doc, BRAND.amber)
  doc.roundedRect(PAD, pillsY, pillW, pillH, 6, 6, 'F')
  setText(doc, BRAND.night)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text(
    'Check In & Connect with Campers',
    PAD + pillW / 2,
    pillsY + 16,
    { align: 'center' },
  )

  // Green: Campground Updates Only — same 7pt for symmetry.
  setFill(doc, BRAND.green)
  doc.roundedRect(
    PAD + pillW + pillGap,
    pillsY,
    pillW,
    pillH,
    6,
    6,
    'F',
  )
  setText(doc, BRAND.night)
  doc.text(
    'Campground Updates Only',
    PAD + pillW + pillGap + pillW / 2,
    pillsY + 16,
    { align: 'center' },
  )

  // Amenity pill row — sits between the action pills and the footer.
  // Solid border for standard amenities, dashed for custom. Packs
  // left-to-right and silently drops anything that won't fit on the
  // 4×6 width; the welcome page is the canonical full list.
  const amenityRowY = pillsY + pillH + 14
  drawAmenityRow(
    doc,
    args.amenities,
    W / 2,
    amenityRowY,
    W - PAD * 2,
  )

  // Footer — privacy line left + FREE FOR GUESTS pill right
  const footerH = 44
  const footerY = H - footerH
  // Subtle darker stripe
  setFill(doc, [0x08, 0x0c, 0x18])
  doc.rect(0, footerY, W, footerH, 'F')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  setText(doc, BRAND.mist)
  const footerLines = doc.splitTextToSize(
    FOOTER_PRIVACY_LINE,
    W - PAD * 2 - 80,
  )
  doc.text(footerLines, PAD, footerY + 18)

  const badgeW = 70
  const badgeH = 18
  setFill(doc, BRAND.green)
  doc.roundedRect(
    W - PAD - badgeW,
    footerY + (footerH - badgeH) / 2,
    badgeW,
    badgeH,
    4,
    4,
    'F',
  )
  setText(doc, BRAND.night)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text(
    'FREE FOR GUESTS',
    W - PAD - badgeW / 2,
    footerY + footerH / 2 + 2.5,
    { align: 'center' },
  )

  return doc.output('blob')
}

// 8.5×11 portrait, single page, centered QR with label + name.
async function buildSimpleQrPdf(args: {
  qrDataUrl: string
  waveDataUrl: string | null
  campgroundName: string
}): Promise<Blob> {
  const { default: JsPDF } = await import('jspdf')
  const doc = new JsPDF({
    unit: 'pt',
    format: 'letter',
    orientation: 'portrait',
  })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  setFill(doc, BRAND.navy)
  doc.rect(0, 0, W, H, 'F')

  // Wordmark centered top, with the 👋 image next to it. Layout
  // accounts for the wave's width when computing horizontal centering
  // so the whole wordmark+wave block stays centered.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(36)
  const roadW = doc.getTextWidth('Road')
  const waveW = doc.getTextWidth('Wave')
  const waveImgSize = args.waveDataUrl ? 36 : 0
  const waveImgGap = args.waveDataUrl ? 10 : 0
  const totalW = roadW + waveW + waveImgGap + waveImgSize
  const wmY = 96
  const wmX = (W - totalW) / 2
  setText(doc, BRAND.white)
  doc.text('Road', wmX, wmY)
  setText(doc, BRAND.amber)
  doc.text('Wave', wmX + roadW, wmY)
  if (args.waveDataUrl) {
    doc.addImage(
      args.waveDataUrl,
      'PNG',
      wmX + roadW + waveW + waveImgGap,
      wmY - waveImgSize + 4,
      waveImgSize,
      waveImgSize,
    )
  }

  // Centered QR
  const qrSize = 360
  const qrX = (W - qrSize) / 2
  const qrY = wmY + 60
  setFill(doc, BRAND.white)
  doc.roundedRect(qrX, qrY, qrSize, qrSize, 16, 16, 'F')
  const inset = 18
  doc.addImage(
    args.qrDataUrl,
    'PNG',
    qrX + inset,
    qrY + inset,
    qrSize - inset * 2,
    qrSize - inset * 2,
  )

  // "Scan to Check In"
  doc.setFontSize(20)
  setText(doc, BRAND.amber)
  doc.text('Scan to Check In', W / 2, qrY + qrSize + 48, { align: 'center' })

  // Campground name
  doc.setFontSize(28)
  setText(doc, BRAND.white)
  const nameLines = doc.splitTextToSize(args.campgroundName, W - 96)
  doc.text(nameLines, W / 2, qrY + qrSize + 86, { align: 'center' })

  return doc.output('blob')
}

// 4×9 portrait — door hanger / site card.
async function buildSiteCardPdf(args: CardArgs): Promise<Blob> {
  const { default: JsPDF } = await import('jspdf')
  // 4in × 9in = 288 × 648pt
  const doc = new JsPDF({
    unit: 'pt',
    format: [288, 648],
    orientation: 'portrait',
  })
  const W = 288
  const H = 648
  const PAD = 18

  setFill(doc, BRAND.navy)
  doc.rect(0, 0, W, H, 'F')

  // Wordmark center top, with the 👋 image next to it.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  const roadW = doc.getTextWidth('Road')
  const waveW = doc.getTextWidth('Wave')
  const waveImgSize = args.waveDataUrl ? 26 : 0
  const waveImgGap = args.waveDataUrl ? 6 : 0
  const totalW = roadW + waveW + waveImgGap + waveImgSize
  const wmY = 56
  const wmX = (W - totalW) / 2
  setText(doc, BRAND.white)
  doc.text('Road', wmX, wmY)
  setText(doc, BRAND.amber)
  doc.text('Wave', wmX + roadW, wmY)
  if (args.waveDataUrl) {
    doc.addImage(
      args.waveDataUrl,
      'PNG',
      wmX + roadW + waveW + waveImgGap,
      wmY - waveImgSize + 3,
      waveImgSize,
      waveImgSize,
    )
  }

  // "WELCOME TO" + name + location
  doc.setFontSize(8)
  setText(doc, BRAND.amber)
  doc.text('WELCOME TO', W / 2, wmY + 30, { align: 'center' })

  doc.setFontSize(22)
  setText(doc, BRAND.white)
  const nameLines = doc.splitTextToSize(args.campgroundName, W - PAD * 2)
  let nameY = wmY + 56
  for (const ln of nameLines) {
    doc.text(ln, W / 2, nameY, { align: 'center' })
    nameY += 26
  }

  if (args.location) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    setText(doc, BRAND.mist)
    doc.text(args.location, W / 2, nameY + 2, { align: 'center' })
  }

  // Big centered QR
  const qrSize = 220
  const qrX = (W - qrSize) / 2
  const qrY = nameY + 32
  setFill(doc, BRAND.white)
  doc.roundedRect(qrX, qrY, qrSize, qrSize, 12, 12, 'F')
  const inset = 12
  doc.addImage(
    args.qrDataUrl,
    'PNG',
    qrX + inset,
    qrY + inset,
    qrSize - inset * 2,
    qrSize - inset * 2,
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  setText(doc, BRAND.amber)
  doc.text('SCAN TO CHECK IN', W / 2, qrY + qrSize + 18, { align: 'center' })

  // Italic tagline
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(10)
  setText(doc, BRAND.amber)
  const taglineLines = doc.splitTextToSize(TAGLINE, W - PAD * 2)
  let ty = qrY + qrSize + 42
  for (const ln of taglineLines) {
    doc.text(ln, W / 2, ty, { align: 'center' })
    ty += 13
  }

  // 5 checkmark bullets centered as a column
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  let by = ty + 10
  for (const b of COUNTER_BULLETS) {
    setText(doc, BRAND.green)
    doc.text('✓', PAD + 8, by)
    setText(doc, BRAND.white)
    doc.text(b, PAD + 22, by)
    by += 13
  }

  // Action pills at bottom
  const pillsY = by + 16
  const pillGap = 6
  const pillW = (W - PAD * 2 - pillGap) / 2
  const pillH = 22

  setFill(doc, BRAND.amber)
  doc.roundedRect(PAD, pillsY, pillW, pillH, 5, 5, 'F')
  setText(doc, BRAND.night)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text('Check In & Connect', PAD + pillW / 2, pillsY + 14, {
    align: 'center',
  })

  setFill(doc, BRAND.green)
  doc.roundedRect(PAD + pillW + pillGap, pillsY, pillW, pillH, 5, 5, 'F')
  setText(doc, BRAND.night)
  doc.text('Updates Only', PAD + pillW + pillGap + pillW / 2, pillsY + 14, {
    align: 'center',
  })

  // Amenity pill row (4×9 has more horizontal room than the 4×6
  // counter card — same render, just at the spot below the action
  // pills).
  drawAmenityRow(
    doc,
    args.amenities,
    W / 2,
    pillsY + pillH + 14,
    W - PAD * 2,
  )

  // Footer privacy line
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  setText(doc, BRAND.mist)
  const footerLines = doc.splitTextToSize(FOOTER_PRIVACY_LINE, W - PAD * 2)
  let fy = H - 50
  for (const ln of footerLines) {
    doc.text(ln, W / 2, fy, { align: 'center' })
    fy += 9
  }

  return doc.output('blob')
}

// ----------------------------------------------------------------
// Email-asset builders
// ----------------------------------------------------------------

function buildEmailSignatureHtml(args: {
  qrDataUrl: string
  campgroundName: string
  campgroundUrl: string
}): string {
  // HTML emails render the 👋 emoji fine via the recipient's system
  // font stack (Apple Color Emoji on macOS/iOS, Segoe UI Emoji on
  // Windows, Noto Color Emoji on Android/Linux). Safe to include in
  // the wordmark here even though the PDFs intentionally skip it.
  //
  // Both the QR image AND the friendly link are wrapped in real <a
  // href> tags. The visible text never includes the URL string —
  // some email clients (Gmail in particular) treat a pasted plain
  // URL as a search query when the surrounding HTML looks ambiguous,
  // dropping the hyperlink. Replacing the raw URL with "View our
  // campground page →" sidesteps that completely.
  const safeName = escapeHtml(args.campgroundName)
  const safeHref = escapeHtml(args.campgroundUrl)
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <tr>
    <td style="padding-right:14px;vertical-align:top;">
      <a href="${safeHref}" target="_blank" rel="noopener" style="display:block;text-decoration:none;border:0;">
        <img src="${args.qrDataUrl}" alt="${safeName} check-in QR" width="84" height="84" style="display:block;border:1px solid #e5e7eb;border-radius:6px;background:#ffffff;" />
      </a>
    </td>
    <td style="vertical-align:top;font-size:12px;line-height:1.45;color:#111827;">
      <p style="margin:0;font-weight:700;font-size:14px;">
        <span style="color:#111827;">Road</span><span style="color:#F5A623;">Wave</span> <span aria-hidden="true">👋</span>
      </p>
      <p style="margin:4px 0 0;color:#374151;">
        Scan to connect with fellow campers at <strong>${safeName}</strong>
      </p>
      <p style="margin:6px 0 0;">
        <a href="${safeHref}" target="_blank" rel="noopener" style="color:#F5A623;font-weight:600;text-decoration:none;">View our campground page &rarr;</a>
      </p>
    </td>
  </tr>
</table>`
}

function buildWelcomeEmailHtml(args: {
  qrDataUrl: string
  campgroundName: string
  campgroundUrl: string
}): string {
  // Same anchor-friendly approach as the signature builder: visible
  // text never carries the URL string, both the inline link and the
  // QR image are real anchors so a recipient can click either one to
  // open the welcome page.
  const safeName = escapeHtml(args.campgroundName)
  const safeHref = escapeHtml(args.campgroundUrl)
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111827;line-height:1.6;font-size:15px;max-width:560px;">
  <p>Welcome to <strong>${safeName}</strong>!</p>
  <p>We use RoadWave so our guests can see campground updates, find activities, and optionally connect with fellow campers &mdash; privately and without sharing exact site numbers.</p>
  <p>Scan the QR code below or <a href="${safeHref}" target="_blank" rel="noopener" style="color:#F5A623;font-weight:600;text-decoration:none;">view our campground page &rarr;</a> to get started. It&rsquo;s free and takes 30 seconds.</p>
  <p style="text-align:center;padding:18px 0;">
    <a href="${safeHref}" target="_blank" rel="noopener" style="display:inline-block;text-decoration:none;border:0;">
      <img src="${args.qrDataUrl}" alt="${safeName} RoadWave QR" width="220" height="220" style="display:inline-block;border:1px solid #e5e7eb;border-radius:8px;background:#ffffff;" />
    </a>
  </p>
  <p style="font-size:12px;color:#6b7280;">
    Private by design. No exact site numbers. No public group chats. No pressure.
  </p>
</div>`
}

function buildWelcomeEmailText(args: {
  campgroundName: string
  campgroundUrl: string
}): string {
  // Renamed from checkInUrl → campgroundUrl on purpose: the only URL
  // a guest-facing template should ever surface is the clean
  // /campground/<slug> welcome URL, not the token-bearing
  // /checkin?token=… variant. Tokens belong inside QR-image data only.
  return [
    `Welcome to ${args.campgroundName}!`,
    '',
    'We use RoadWave so our guests can see campground updates, find activities, and optionally connect with fellow campers — privately and without sharing exact site numbers.',
    '',
    `Scan the QR code on our welcome card or visit ${args.campgroundUrl} to get started. It's free and takes 30 seconds.`,
    '',
    'Private by design. No exact site numbers. No public group chats. No pressure.',
  ].join('\n')
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

// Tuple → jsPDF setFillColor / setTextColor wrappers. Keeps the brand
// palette legible at the call sites without typing `setFillColor(0x4B,
// 0xAE, 0x82)` everywhere.
type Rgb = readonly [number, number, number]

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- jsPDF
function setFill(doc: any, c: Rgb) {
  doc.setFillColor(c[0], c[1], c[2])
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- jsPDF
function setText(doc: any, c: Rgb) {
  doc.setTextColor(c[0], c[1], c[2])
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'campground'
  )
}

// Rasterise a single emoji glyph to a transparent-background PNG data
// URL via an offscreen canvas. Used to embed 👋 in jsPDF documents,
// where the built-in fonts can't render emoji codepoints. Falls back
// to an empty string if the canvas API isn't available (server-side
// render of this file shouldn't happen — the component is 'use client'
// — but the guard keeps tooling happy).
function renderEmojiToPng(emoji: string, sizePx: number): string {
  if (typeof document === 'undefined') return ''
  const canvas = document.createElement('canvas')
  canvas.width = sizePx
  canvas.height = sizePx
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  // Slightly under-fill so the glyph isn't clipped at the edges by
  // browsers that render emoji larger than the nominal font size.
  const fontPx = Math.round(sizePx * 0.82)
  ctx.font =
    `${fontPx}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", ` +
    `"Twemoji Mozilla", "EmojiOne Color", "Android Emoji", system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, sizePx / 2, sizePx / 2 + sizePx * 0.04)
  return canvas.toDataURL('image/png')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Copy HTML to clipboard with a plain-text fallback. Modern browsers
// honour the rich-HTML payload when pasting into Gmail / Outlook /
// Apple Mail; fallback ensures the copy still works in browsers that
// don't expose ClipboardItem (older Firefox versions).
async function copyHtmlToClipboard(
  html: string,
  plain: string,
): Promise<void> {
  try {
    if (
      typeof window !== 'undefined' &&
      typeof window.ClipboardItem !== 'undefined' &&
      navigator.clipboard?.write
    ) {
      const item = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      })
      await navigator.clipboard.write([item])
      return
    }
  } catch {
    // Fall through to plain text.
  }
  await navigator.clipboard.writeText(html)
}
