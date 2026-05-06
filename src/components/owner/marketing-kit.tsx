'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

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
        campgroundName,
        location,
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

  async function copyEmailSignature() {
    if (!qrPngDataUrl) return
    const html = buildEmailSignatureHtml({
      qrDataUrl: qrPngDataUrl,
      campgroundName,
      checkInUrl: checkInUrl as string,
    })
    const plain = `Scan to connect with fellow campers at ${campgroundName} — ${checkInUrl}`
    await copyHtmlToClipboard(html, plain)
    flashCopied('signature')
  }

  async function copyWelcomeEmailHtml() {
    if (!qrPngDataUrl) return
    const html = buildWelcomeEmailHtml({
      qrDataUrl: qrPngDataUrl,
      campgroundName,
      checkInUrl: checkInUrl as string,
    })
    const plain = buildWelcomeEmailText({
      campgroundName,
      checkInUrl: checkInUrl as string,
    })
    await copyHtmlToClipboard(html, plain)
    flashCopied('welcome-html')
  }

  async function copyWelcomeEmailText() {
    const plain = buildWelcomeEmailText({
      campgroundName,
      checkInUrl: checkInUrl as string,
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
                checkInUrl={checkInUrl}
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
  checkInUrl,
}: {
  qrDataUrl: string
  campgroundName: string
  checkInUrl: string
}) {
  return (
    <div className="rounded-lg bg-white text-night p-3 text-[11px] flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrDataUrl} alt="" className="h-12 w-12" />
      <div>
        <p className="font-bold">
          Road<span className="text-amber-500">Wave</span>
        </p>
        <p>
          Scan to connect with fellow campers at{' '}
          <span className="font-semibold">{campgroundName}</span>
        </p>
        <p className="text-blue-700 underline break-all">{checkInUrl}</p>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Asset builders
// ----------------------------------------------------------------

type CardArgs = {
  qrDataUrl: string
  campgroundName: string
  location: string
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

  // Top-left wordmark — Road white, Wave amber
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  setText(doc, BRAND.white)
  doc.text('Road', PAD, PAD + 18)
  const roadW = doc.getTextWidth('Road')
  setText(doc, BRAND.amber)
  doc.text('Wave', PAD + roadW, PAD + 18)

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

  // Amber: Check In & Connect with Campers
  setFill(doc, BRAND.amber)
  doc.roundedRect(PAD, pillsY, pillW, pillH, 6, 6, 'F')
  setText(doc, BRAND.night)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text(
    'Check In & Connect with Campers',
    PAD + pillW / 2,
    pillsY + 16,
    { align: 'center' },
  )

  // Green: Campground Updates Only
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

  // Wordmark centered top
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(36)
  const roadW = doc.getTextWidth('Road')
  const waveW = doc.getTextWidth('Wave')
  const totalW = roadW + waveW
  const wmY = 96
  setText(doc, BRAND.white)
  doc.text('Road', (W - totalW) / 2, wmY)
  setText(doc, BRAND.amber)
  doc.text('Wave', (W - totalW) / 2 + roadW, wmY)

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

  // Wordmark center top
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  const roadW = doc.getTextWidth('Road')
  const waveW = doc.getTextWidth('Wave')
  const totalW = roadW + waveW
  const wmY = 56
  setText(doc, BRAND.white)
  doc.text('Road', (W - totalW) / 2, wmY)
  setText(doc, BRAND.amber)
  doc.text('Wave', (W - totalW) / 2 + roadW, wmY)

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
  checkInUrl: string
}): string {
  const safeName = escapeHtml(args.campgroundName)
  const safeUrl = escapeHtml(args.checkInUrl)
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <tr>
    <td style="padding-right:14px;vertical-align:top;">
      <img src="${args.qrDataUrl}" alt="${safeName} check-in QR" width="84" height="84" style="display:block;border:1px solid #e5e7eb;border-radius:6px;background:#ffffff;" />
    </td>
    <td style="vertical-align:top;font-size:12px;line-height:1.45;color:#111827;">
      <p style="margin:0;font-weight:700;font-size:14px;">
        <span style="color:#111827;">Road</span><span style="color:#F5A623;">Wave</span>
      </p>
      <p style="margin:4px 0 0;color:#374151;">
        Scan to connect with fellow campers at <strong>${safeName}</strong>
      </p>
      <p style="margin:6px 0 0;">
        <a href="${safeUrl}" style="color:#F5A623;text-decoration:underline;">${safeUrl}</a>
      </p>
    </td>
  </tr>
</table>`
}

function buildWelcomeEmailHtml(args: {
  qrDataUrl: string
  campgroundName: string
  checkInUrl: string
}): string {
  const safeName = escapeHtml(args.campgroundName)
  const safeUrl = escapeHtml(args.checkInUrl)
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111827;line-height:1.6;font-size:15px;max-width:560px;">
  <p>Welcome to <strong>${safeName}</strong>!</p>
  <p>We use RoadWave so our guests can see campground updates, find activities, and optionally connect with fellow campers — privately and without sharing exact site numbers.</p>
  <p>Scan the QR code below or visit <a href="${safeUrl}" style="color:#F5A623;text-decoration:underline;">${safeUrl}</a> to get started. It&rsquo;s free and takes 30 seconds.</p>
  <p style="text-align:center;padding:18px 0;">
    <img src="${args.qrDataUrl}" alt="${safeName} RoadWave QR" width="220" height="220" style="display:inline-block;border:1px solid #e5e7eb;border-radius:8px;background:#ffffff;" />
  </p>
  <p style="font-size:12px;color:#6b7280;">
    Private by design. No exact site numbers. No public group chats. No pressure.
  </p>
</div>`
}

function buildWelcomeEmailText(args: {
  campgroundName: string
  checkInUrl: string
}): string {
  return [
    `Welcome to ${args.campgroundName}!`,
    '',
    'We use RoadWave so our guests can see campground updates, find activities, and optionally connect with fellow campers — privately and without sharing exact site numbers.',
    '',
    `Scan the QR code on our welcome card or visit ${args.checkInUrl} to get started. It's free and takes 30 seconds.`,
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
