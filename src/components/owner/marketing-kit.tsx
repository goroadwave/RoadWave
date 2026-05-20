'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { renderEmojiToPng as renderEmojiToPngShared } from '@/lib/owner/qr-card-brand'

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

// Card copy. The campground brand leads (logo + name); RoadWave plays
// a supporting role via the small "Powered by RoadWave 👋" tag below
// the campground name and a single tagline footer at the very bottom.
// No bulleted trust points -- the prior layout's four checkmarks
// pushed RoadWave-branded copy harder than the campground brand.
const CARD_HEADLINE = 'Scan for Campground Info'
const CARD_SUBTEXT =
  'View the park map, Wi-Fi, rules, updates, office help, and optional camper connections.'
const CARD_TAGLINE =
  'Camper connections are optional. No login needed for campground info.'

type Props = {
  campgroundName: string
  location: string
  logoUrl: string | null
  slug: string
  siteUrl: string
  checkInUrl: string | null
}

export function MarketingKit({
  campgroundName,
  location,
  logoUrl,
  slug,
  siteUrl,
  checkInUrl,
}: Props) {
  const [qrPngDataUrl, setQrPngDataUrl] = useState<string | null>(null)
  // 👋 rasterised to a PNG via the browser canvas + system emoji font.
  // jsPDF's built-in fonts can't render emoji glyphs, so the wave next
  // to the RoadWave wordmark inside every PDF goes in as an embedded
  // image instead. Generated once on mount and reused across every
  // PDF download.
  const [waveDataUrl, setWaveDataUrl] = useState<string | null>(null)
  // Campground logo, fetched + rasterised to PNG via a canvas so it
  // can be embedded in jsPDF regardless of source format (PNG / JPEG
  // / WebP / SVG all decode through the browser's image loader,
  // then we re-encode as PNG). Null when the campground has no logo
  // configured OR the fetch fails — in that case the card omits the
  // logo block and the layout collapses to wordmark + name.
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  // Track the most recent copy attempt's label + outcome. Buttons read
  // both so they can show "Copied ✓" on success or
  // "Copy failed — press and hold to select" on failure for 2 seconds.
  const [copyResult, setCopyResult] = useState<
    { label: string; ok: boolean } | null
  >(null)
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
    setWaveDataUrl(renderEmojiToPngShared('👋', 192))
  }, [])

  // Load the campground logo (any format) and re-encode to PNG so
  // jsPDF can embed it. We use the browser's native <img> + canvas
  // pipeline because:
  //   1. It handles PNG, JPEG, WebP, and SVG transparently -- jsPDF
  //      itself only reliably accepts PNG/JPEG.
  //   2. Re-encoding to PNG strips any metadata (EXIF orientation,
  //      ICC profile) that jsPDF doesn't honour, so the rendered
  //      logo always looks the same as it does in the browser.
  // Failures are silent: a null logoDataUrl just collapses the logo
  // block in the PDF so the card still renders cleanly.
  useEffect(() => {
    // Skip the fetch path when there's no logoUrl; an already-loaded
    // logoDataUrl from a prior mount stays in place until the
    // component unmounts. Lint's react-hooks/set-state-in-effect rule
    // doesn't permit a synchronous setLogoDataUrl(null) reset in this
    // branch, so the slight staleness here is the accepted tradeoff
    // (same trade made by the QR effect above).
    if (!logoUrl) return
    let cancelled = false
    ;(async () => {
      const d = await loadImageToPngDataUrl(logoUrl, 400)
      if (!cancelled) setLogoDataUrl(d)
    })()
    return () => {
      cancelled = true
    }
  }, [logoUrl])

  function flashCopyResult(label: string, ok: boolean) {
    setCopyResult({ label, ok })
    if (copyResetTimer.current) window.clearTimeout(copyResetTimer.current)
    copyResetTimer.current = window.setTimeout(
      () => setCopyResult(null),
      2_000,
    )
  }

  // UI helper — given a button's label key and its default label,
  // returns the text to show: "Copied ✓" on success, "Copy failed" on
  // failure, or the original label otherwise.
  function copyButtonLabel(label: string, fallback: string): string {
    if (copyResult?.label !== label) return fallback
    return copyResult.ok
      ? 'Copied ✓'
      : 'Copy failed — press and hold to select'
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
        logoDataUrl,
        campgroundName,
        location,
      })
      downloadBlob(blob, `${baseFilename}-front-desk-card-4x6.pdf`)
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
        logoDataUrl,
        campgroundName,
      })
      downloadBlob(blob, `${baseFilename}-qr-sign.pdf`)
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
        logoDataUrl,
        campgroundName,
        location,
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
    const plain = `View our campground map, Wi-Fi, updates, office help, and optional camper connections at ${campgroundName} — ${campgroundPageUrl}`
    const ok = await copyHtmlToClipboard(html, plain)
    flashCopyResult('signature', ok)
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
    const ok = await copyHtmlToClipboard(html, plain)
    flashCopyResult('welcome-html', ok)
  }

  async function copyWelcomeEmailText() {
    // Plain-text version's URL has no token either — the welcome page
    // looks up the active token from the DB on its own.
    const plain = buildWelcomeEmailText({
      campgroundName,
      campgroundUrl: campgroundPageUrl,
    })
    const ok = await copyPlainToClipboard(plain)
    flashCopyResult('welcome-text', ok)
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

      {/* Quick action: preview / open the live guest welcome page in a
          new tab. Mirrors the "Your RoadWave page" surface on the
          dashboard but lives here too so it's reachable from the
          Marketing tab without backtracking. */}
      <div className="rounded-xl border border-white/5 bg-card px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.14em] text-flame font-semibold">
            Live guest welcome page
          </p>
          <p className="text-xs text-mist truncate">{campgroundPageUrl}</p>
        </div>
        <a
          href={campgroundPageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg border border-flame/40 bg-flame/[0.06] text-cream px-3 py-2 text-xs font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors"
        >
          Open guest page <span aria-hidden>↗</span>
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Asset
          title="Front Desk Guest Info Card — 4×6 PDF"
          description="Place this at your check-in counter so guests can quickly access your park map, Wi-Fi, rules, office help, updates, and optional camper connections."
          where="FRONT DESK · WELCOME PACKET · CHECK-IN COUNTER"
          actions={
            <PrimaryButton
              onClick={downloadCounterCard}
              disabled={!qrReady || busy === 'counter'}
              loading={busy === 'counter'}
            >
              Download Front Desk Card PDF
            </PrimaryButton>
          }
          preview={qrPngDataUrl && <QrThumb dataUrl={qrPngDataUrl} />}
        />

        <Asset
          title="QR Code PNG"
          description="Use your campground QR code on signs, flyers, welcome packets, emails, and social media."
          where="SIGNS · FLYERS · WELCOME PACKETS · SOCIAL MEDIA"
          actions={
            <PrimaryButton onClick={downloadQrPng} disabled={!qrReady}>
              Download QR PNG (1000×1000)
            </PrimaryButton>
          }
          preview={qrPngDataUrl && <QrThumb dataUrl={qrPngDataUrl} />}
        />

        <Asset
          title="Print-Ready QR Sign PDF"
          description="Simple print-ready sign with your campground name and QR code."
          where="OFFICE · NOTICEBOARDS · PRINTER-READY"
          actions={
            <PrimaryButton
              onClick={downloadQrPdf}
              disabled={!qrReady || busy === 'qr-pdf'}
              loading={busy === 'qr-pdf'}
            >
              Download QR Sign PDF
            </PrimaryButton>
          }
          preview={qrPngDataUrl && <QrThumb dataUrl={qrPngDataUrl} />}
        />

        <Asset
          title="Email Signature"
          description="Paste this into Gmail, Outlook, Apple Mail, or your email client so guests can quickly open your campground info page."
          where="GMAIL · OUTLOOK · APPLE MAIL · ANY EMAIL CLIENT"
          actions={
            <PrimaryButton
              onClick={copyEmailSignature}
              disabled={!qrReady}
            >
              {copyButtonLabel('signature', 'Copy HTML')}
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
          description="Pre-written welcome email personalized for your campground. Paste the HTML version into a rich-email client, or the plain-text version anywhere."
          where="RESERVATION CONFIRMATIONS · PRE-ARRIVAL EMAILS · MAILCHIMP / KLAVIYO"
          actions={
            <div className="flex flex-col sm:flex-row gap-2">
              <PrimaryButton
                onClick={copyWelcomeEmailHtml}
                disabled={!qrReady}
              >
                {copyButtonLabel('welcome-html', 'Copy HTML version')}
              </PrimaryButton>
              <SecondaryButton onClick={copyWelcomeEmailText}>
                {copyButtonLabel('welcome-text', 'Copy plain text')}
              </SecondaryButton>
            </div>
          }
          preview={
            <p className="text-xs text-mist leading-relaxed bg-night/40 rounded-lg p-3 border border-white/5">
              Welcome to <span className="text-cream">{campgroundName}</span>!
              Scan our QR code to see your park map, Wi-Fi, rules, updates,
              office help, and optional camper connections — no login needed.
            </p>
          }
        />

        <Asset
          title="Site Card — 4×9 PDF"
          description="Print format for individual campsites or cabin doors. Same Front Desk Card layout in a taller 4×9 format with a larger QR."
          where="CABIN DOORS · POST STAKES · DOOR HANGERS · IN-SITE CARDS"
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
        <img src={qrDataUrl} alt={`${campgroundName} campground info QR`} className="h-12 w-12" />
      </a>
      <div>
        <p className="font-semibold">{campgroundName}</p>
        <p className="text-night/80">
          View our campground map, Wi-Fi, updates, office help, and optional
          camper connections.
        </p>
        <p>
          <a
            href={campgroundUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F5A623', fontWeight: 600 }}
          >
            Open the campground info page →
          </a>
        </p>
        <p className="text-night/60 text-[10px]">
          Powered by{' '}
          <span style={{ fontWeight: 600 }}>
            Road<span style={{ color: '#F5A623' }}>Wave</span>{' '}
            <span aria-hidden>👋</span>
          </span>
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
  logoDataUrl: string | null
  campgroundName: string
  location: string
}

// 4×6 portrait, 288×432pt. Front Desk Guest Info Card.
// Layout hierarchy (top → bottom):
//   1. Campground logo if uploaded (max 70pt tall, preserves aspect)
//   2. Campground name (large, white)
//   3. Location (small, mist)
//   4. "Powered by RoadWave 👋" (small, secondary)
//   5. Centered QR
//   6. "Scan for Campground Info" headline (amber)
//   7. Subtext (mist)
//   8. "Camper connections are optional. No login needed for
//      campground info." footer tagline
//
// The campground brand leads; RoadWave plays the supporting role.
async function buildCounterCardPdf(args: CardArgs): Promise<Blob> {
  const { default: JsPDF } = await import('jspdf')
  const doc = new JsPDF({
    unit: 'pt',
    format: [288, 432],
    orientation: 'portrait',
  })
  const W = 288
  const H = 432
  const PAD = 18

  // Background
  setFill(doc, BRAND.navy)
  doc.rect(0, 0, W, H, 'F')

  // ---- Logo (optional) ----
  let cursorY = PAD + 14
  if (args.logoDataUrl) {
    const props = doc.getImageProperties(args.logoDataUrl)
    const maxH = 56
    const maxW = 120
    const ratio = Math.min(maxW / props.width, maxH / props.height)
    const drawW = Math.round(props.width * ratio)
    const drawH = Math.round(props.height * ratio)
    doc.addImage(
      args.logoDataUrl,
      'PNG',
      (W - drawW) / 2,
      cursorY,
      drawW,
      drawH,
    )
    cursorY += drawH + 10
  }

  // ---- Campground name (the dominant element) ----
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  setText(doc, BRAND.white)
  const nameLines = doc.splitTextToSize(args.campgroundName, W - PAD * 2)
  for (const ln of nameLines) {
    doc.text(ln, W / 2, cursorY + 14, { align: 'center' })
    cursorY += 20
  }

  // ---- Location ----
  if (args.location) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    setText(doc, BRAND.mist)
    doc.text(args.location, W / 2, cursorY + 6, { align: 'center' })
    cursorY += 12
  }

  // ---- "Powered by RoadWave 👋" — small, secondary ----
  cursorY += 10
  drawPoweredByRoadwave(doc, {
    fontSize: 10,
    waveDataUrl: args.waveDataUrl,
    y: cursorY,
    centerX: W / 2,
  })
  cursorY += 16

  // ---- Centered QR ----
  const qrSize = 152
  const qrX = (W - qrSize) / 2
  const qrY = cursorY + 8
  setFill(doc, BRAND.white)
  doc.roundedRect(qrX, qrY, qrSize, qrSize, 8, 8, 'F')
  const inset = 8
  doc.addImage(
    args.qrDataUrl,
    'PNG',
    qrX + inset,
    qrY + inset,
    qrSize - inset * 2,
    qrSize - inset * 2,
  )

  // ---- Headline ----
  const belowQrY = qrY + qrSize + 22
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  setText(doc, BRAND.amber)
  doc.text(CARD_HEADLINE, W / 2, belowQrY, { align: 'center' })

  // ---- Subtext ----
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.2)
  setText(doc, BRAND.mist)
  const subLines = doc.splitTextToSize(CARD_SUBTEXT, W - PAD * 2)
  let subY = belowQrY + 13
  for (const ln of subLines) {
    doc.text(ln, W / 2, subY, { align: 'center' })
    subY += 10
  }

  // ---- Footer tagline ----
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  setText(doc, BRAND.mist)
  const tagLines = doc.splitTextToSize(CARD_TAGLINE, W - PAD * 2)
  let tagY = H - PAD - (tagLines.length - 1) * 9
  for (const ln of tagLines) {
    doc.text(ln, W / 2, tagY, { align: 'center' })
    tagY += 9
  }

  return doc.output('blob')
}

// 8.5×11 portrait. Print-Ready QR Sign — single page with the
// campground identity on top and a large centered QR. Same hierarchy
// as the 4×6 card: campground brand leads, RoadWave attribution is
// secondary.
async function buildSimpleQrPdf(args: {
  qrDataUrl: string
  waveDataUrl: string | null
  logoDataUrl: string | null
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
  const PAD = 56

  setFill(doc, BRAND.navy)
  doc.rect(0, 0, W, H, 'F')

  // ---- Logo (optional) ----
  let cursorY = 80
  if (args.logoDataUrl) {
    const props = doc.getImageProperties(args.logoDataUrl)
    const maxH = 110
    const maxW = 260
    const ratio = Math.min(maxW / props.width, maxH / props.height)
    const drawW = Math.round(props.width * ratio)
    const drawH = Math.round(props.height * ratio)
    doc.addImage(
      args.logoDataUrl,
      'PNG',
      (W - drawW) / 2,
      cursorY,
      drawW,
      drawH,
    )
    cursorY += drawH + 18
  }

  // ---- Campground name ----
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(30)
  setText(doc, BRAND.white)
  const nameLines = doc.splitTextToSize(args.campgroundName, W - PAD * 2)
  for (const ln of nameLines) {
    doc.text(ln, W / 2, cursorY + 28, { align: 'center' })
    cursorY += 36
  }

  // ---- "Powered by RoadWave 👋" ----
  cursorY += 8
  drawPoweredByRoadwave(doc, {
    fontSize: 13,
    waveDataUrl: args.waveDataUrl,
    y: cursorY,
    centerX: W / 2,
  })
  cursorY += 28

  // ---- Centered QR ----
  const qrSize = 320
  const qrX = (W - qrSize) / 2
  const qrY = cursorY
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

  // ---- Headline ----
  const belowQrY = qrY + qrSize + 44
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  setText(doc, BRAND.amber)
  doc.text(CARD_HEADLINE, W / 2, belowQrY, { align: 'center' })

  // ---- Subtext ----
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(13)
  setText(doc, BRAND.mist)
  const subLines = doc.splitTextToSize(CARD_SUBTEXT, W - PAD * 2)
  let subY = belowQrY + 22
  for (const ln of subLines) {
    doc.text(ln, W / 2, subY, { align: 'center' })
    subY += 16
  }

  // ---- Footer tagline ----
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  setText(doc, BRAND.mist)
  const tagLines = doc.splitTextToSize(CARD_TAGLINE, W - PAD * 2)
  let tagY = H - PAD - (tagLines.length - 1) * 14
  for (const ln of tagLines) {
    doc.text(ln, W / 2, tagY, { align: 'center' })
    tagY += 14
  }

  return doc.output('blob')
}

// 4×9 portrait — door hanger / site card. Same hierarchy as the
// 4×6 Front Desk Guest Info Card, just taller, with more breathing
// room and a larger QR.
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
  const PAD = 22

  setFill(doc, BRAND.navy)
  doc.rect(0, 0, W, H, 'F')

  // ---- Logo (optional) ----
  let cursorY = PAD + 20
  if (args.logoDataUrl) {
    const props = doc.getImageProperties(args.logoDataUrl)
    const maxH = 80
    const maxW = 160
    const ratio = Math.min(maxW / props.width, maxH / props.height)
    const drawW = Math.round(props.width * ratio)
    const drawH = Math.round(props.height * ratio)
    doc.addImage(
      args.logoDataUrl,
      'PNG',
      (W - drawW) / 2,
      cursorY,
      drawW,
      drawH,
    )
    cursorY += drawH + 14
  }

  // ---- Campground name ----
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  setText(doc, BRAND.white)
  const nameLines = doc.splitTextToSize(args.campgroundName, W - PAD * 2)
  for (const ln of nameLines) {
    doc.text(ln, W / 2, cursorY + 20, { align: 'center' })
    cursorY += 28
  }

  // ---- Location ----
  if (args.location) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    setText(doc, BRAND.mist)
    doc.text(args.location, W / 2, cursorY + 8, { align: 'center' })
    cursorY += 14
  }

  // ---- "Powered by RoadWave 👋" — small, secondary ----
  cursorY += 12
  drawPoweredByRoadwave(doc, {
    fontSize: 12,
    waveDataUrl: args.waveDataUrl,
    y: cursorY,
    centerX: W / 2,
  })
  cursorY += 22

  // ---- Centered QR ----
  const qrSize = 200
  const qrX = (W - qrSize) / 2
  const qrY = cursorY + 8
  setFill(doc, BRAND.white)
  doc.roundedRect(qrX, qrY, qrSize, qrSize, 10, 10, 'F')
  const inset = 10
  doc.addImage(
    args.qrDataUrl,
    'PNG',
    qrX + inset,
    qrY + inset,
    qrSize - inset * 2,
    qrSize - inset * 2,
  )

  // ---- Headline ----
  const belowQrY = qrY + qrSize + 32
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  setText(doc, BRAND.amber)
  doc.text(CARD_HEADLINE, W / 2, belowQrY, { align: 'center' })

  // ---- Subtext ----
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  setText(doc, BRAND.mist)
  const subLines = doc.splitTextToSize(CARD_SUBTEXT, W - PAD * 2)
  let subY = belowQrY + 18
  for (const ln of subLines) {
    doc.text(ln, W / 2, subY, { align: 'center' })
    subY += 13
  }

  // ---- Footer tagline ----
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  setText(doc, BRAND.mist)
  const tagLines = doc.splitTextToSize(CARD_TAGLINE, W - PAD * 2)
  let tagY = H - PAD - (tagLines.length - 1) * 11
  for (const ln of tagLines) {
    doc.text(ln, W / 2, tagY, { align: 'center' })
    tagY += 11
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
  // Campground brand leads the signature; the "Powered by RoadWave"
  // attribution sits below in the supporting role. Visible text
  // never carries the raw URL string -- Gmail's plain-text fallback
  // treats pasted URLs as search queries when surrounding HTML looks
  // ambiguous, dropping the hyperlink. Replacing the raw URL with
  // "Open the campground info page →" sidesteps that completely.
  const safeName = escapeHtml(args.campgroundName)
  const safeHref = escapeHtml(args.campgroundUrl)
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <tr>
    <td style="padding-right:14px;vertical-align:top;">
      <a href="${safeHref}" target="_blank" rel="noopener" style="display:block;text-decoration:none;border:0;">
        <img src="${args.qrDataUrl}" alt="${safeName} campground info QR" width="84" height="84" style="display:block;border:1px solid #e5e7eb;border-radius:6px;background:#ffffff;" />
      </a>
    </td>
    <td style="vertical-align:top;font-size:12px;line-height:1.45;color:#111827;">
      <p style="margin:0;font-weight:700;font-size:14px;">
        ${safeName}
      </p>
      <p style="margin:4px 0 0;color:#374151;">
        View our campground map, Wi-Fi, updates, office help, and optional camper connections.
      </p>
      <p style="margin:6px 0 0;">
        <a href="${safeHref}" target="_blank" rel="noopener" style="color:#F5A623;font-weight:600;text-decoration:none;">Open the campground info page &rarr;</a>
      </p>
      <p style="margin:6px 0 0;font-size:10px;color:#6b7280;">
        Powered by <span style="font-weight:600;color:#111827;">Road</span><span style="font-weight:600;color:#F5A623;">Wave</span> <span aria-hidden="true">👋</span>
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
  // Guest info first, optional camper connections second. Same
  // anchor-friendly approach as the signature builder.
  const safeName = escapeHtml(args.campgroundName)
  const safeHref = escapeHtml(args.campgroundUrl)
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111827;line-height:1.6;font-size:15px;max-width:560px;">
  <p>Welcome to <strong>${safeName}</strong>!</p>
  <p>Scan the QR code below or <a href="${safeHref}" target="_blank" rel="noopener" style="color:#F5A623;font-weight:600;text-decoration:none;">open our campground info page &rarr;</a> to see your park map, Wi-Fi, rules, updates, office help, and optional camper connections.</p>
  <p>No login needed for campground info. Camper connections are optional.</p>
  <p style="text-align:center;padding:18px 0;">
    <a href="${safeHref}" target="_blank" rel="noopener" style="display:inline-block;text-decoration:none;border:0;">
      <img src="${args.qrDataUrl}" alt="${safeName} campground info QR" width="220" height="220" style="display:inline-block;border:1px solid #e5e7eb;border-radius:8px;background:#ffffff;" />
    </a>
  </p>
  <p style="font-size:12px;color:#6b7280;">
    Powered by <span style="font-weight:600;color:#111827;">Road</span><span style="font-weight:600;color:#F5A623;">Wave</span> <span aria-hidden="true">👋</span>. Private by design — no exact site numbers, no public group chats.
  </p>
</div>`
}

function buildWelcomeEmailText(args: {
  campgroundName: string
  campgroundUrl: string
}): string {
  // The only URL surfaced in guest-facing copy is the clean
  // /campground/<slug> page, not the token-bearing variant. Tokens
  // belong inside QR-image data only.
  return [
    `Welcome to ${args.campgroundName}!`,
    '',
    `Scan our QR code or visit ${args.campgroundUrl} to see your park map, Wi-Fi, rules, updates, office help, and optional camper connections.`,
    '',
    'No login needed for campground info. Camper connections are optional.',
    '',
    'Powered by RoadWave 👋. Private by design — no exact site numbers, no public group chats.',
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

// Draw "Powered by RoadWave 👋" centered around centerX. The
// "Powered by " prefix renders in mist (small-caps secondary), then
// the canonical RoadWave wordmark with the 👋 PNG flush right. Used
// on every marketing-kit PDF so the campground brand stays primary
// and the RoadWave attribution lives one tier down.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- jsPDF dynamic-import types live behind the import call
function drawPoweredByRoadwave(doc: any, args: {
  fontSize: number
  waveDataUrl: string | null
  y: number
  centerX: number
}) {
  const { fontSize, waveDataUrl, y, centerX } = args
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(fontSize)
  const prefix = 'Powered by '
  const prefixW = doc.getTextWidth(prefix)
  doc.setFont('helvetica', 'bold')
  const roadW = doc.getTextWidth('Road')
  const waveW = doc.getTextWidth('Wave')
  const waveImgGap = waveDataUrl ? fontSize * 0.18 : 0
  const waveImgSize = waveDataUrl ? fontSize : 0
  const totalW = prefixW + roadW + waveW + waveImgGap + waveImgSize
  const startX = centerX - totalW / 2

  // "Powered by " (mist, regular)
  doc.setFont('helvetica', 'normal')
  setText(doc, BRAND.mist)
  doc.text(prefix, startX, y)

  // "Road" (cream, bold)
  doc.setFont('helvetica', 'bold')
  setText(doc, BRAND.cream)
  doc.text('Road', startX + prefixW, y)

  // "Wave" (amber, bold)
  setText(doc, BRAND.amber)
  doc.text('Wave', startX + prefixW + roadW, y)

  // 👋
  if (waveDataUrl) {
    const imgX = startX + prefixW + roadW + waveW + waveImgGap
    const imgY = y - waveImgSize + waveImgSize * 0.15
    doc.addImage(waveDataUrl, 'PNG', imgX, imgY, waveImgSize, waveImgSize)
  }
}

// Load any browser-supported image URL and re-encode to a PNG data
// URL clamped to maxDim on the long edge. Returns null on any
// failure (network error, CORS denial, decode error). Used to embed
// owner-uploaded logos (PNG / JPEG / WebP / SVG) in jsPDF documents.
async function loadImageToPngDataUrl(
  url: string,
  maxDim: number,
): Promise<string | null> {
  if (typeof document === 'undefined') return null
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.crossOrigin = 'anonymous'
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('image load failed'))
      // Append a cache-buster only if the URL doesn't already carry
      // one (the campground logo upload already adds ?v=<ts>). This
      // prevents the browser from serving a stale cached response
      // without CORS headers.
      i.src = url
    })
    const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1)
    const w = Math.max(1, Math.round(img.width * ratio))
    const h = Math.max(1, Math.round(img.height * ratio))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, w, h)
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
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
): Promise<boolean> {
  // Tier 1: modern rich clipboard (Chrome / Safari / new Firefox).
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
      return true
    }
  } catch {
    // Fall through.
  }
  // Tier 2: writeText (plain text only).
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(plain)
      return true
    }
  } catch {
    // Fall through.
  }
  // Tier 3: legacy execCommand via an off-screen textarea. Works on
  // older browsers + non-HTTPS contexts where navigator.clipboard is
  // unavailable. Marked deprecated but still ships in every shipping
  // browser at the time of writing.
  return execCommandCopyFallback(plain)
}

async function copyPlainToClipboard(plain: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(plain)
      return true
    }
  } catch {
    // Fall through.
  }
  return execCommandCopyFallback(plain)
}

function execCommandCopyFallback(text: string): boolean {
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    // Avoid scroll-to + selection-popup on mobile.
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '0'
    ta.style.left = '0'
    ta.style.width = '1px'
    ta.style.height = '1px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}
