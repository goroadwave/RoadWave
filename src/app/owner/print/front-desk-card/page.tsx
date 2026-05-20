import { redirect } from 'next/navigation'
import QR from 'qrcode'
import {
  AutoPrintOnLoad,
  PrintCardButton,
} from '@/components/owner/auto-print-on-load'
import { loadOwnerCampground } from '@/app/owner/(authed)/_helpers'

// Dedicated printable Front Desk Guest Hub Card. Opens in a new tab
// from the owner QR panel. Server-renders the campground data + QR
// PNG so the browser has zero work to do before the print dialog
// fires; the AutoPrintOnLoad client component waits for the image
// to decode, then triggers window.print() once.
//
// Why this lives at /owner/print/front-desk-card (outside the
// (authed) route group):
//   * The (authed) layout adds the owner header + bottom nav +
//     Riley chat overlay, all of which would clutter the print
//     output. Mounting outside that layout gives us a clean canvas.
//   * Auth is still required -- loadOwnerCampground() runs at the
//     top and redirects to /owner/login when the visitor isn't a
//     campground owner.
//
// The Front Desk QR encodes /campground/<slug> (no token). This is
// the no-login guest hub URL; scanning it never triggers signup,
// login, email confirmation, or the camper check-in flow.

export const dynamic = 'force-dynamic'

// Bullet hierarchy on the printed card. Each item is gated on the
// owner having that section enabled AND having filled in real
// content. If nothing is enabled we fall back to the generic full
// list so the card doesn't look empty.
type BulletFlags = {
  hasWifi: boolean
  hasMap: boolean
  hasRules: boolean
  hasEmergency: boolean
  hasLocalRecs: boolean
  hasContactOffice: boolean
  hasReview: boolean
  hasBookAgain: boolean
}

function buildBullets(flags: BulletFlags): string[] {
  const items: string[] = []
  if (flags.hasWifi) items.push('Wi-Fi Info')
  if (flags.hasMap) items.push('Park Map')
  if (flags.hasRules) items.push('Rules & Policies')
  if (flags.hasEmergency) items.push('Emergency Info')
  if (flags.hasLocalRecs) items.push('Local Recommendations')
  if (flags.hasContactOffice) items.push('Ask the Office / Report an Issue')
  if (flags.hasReview) items.push('Leave a Review')
  if (flags.hasBookAgain) items.push('Book Your Next Stay')
  items.push('Optional Camper Connection')
  // If only the always-on item ended up in the list, fall back to a
  // generic feature pitch so the bullets section isn't a single line.
  if (items.length <= 1) {
    return [
      'Wi-Fi Info',
      'Park Map',
      'Rules & Policies',
      'Emergency Info',
      'Local Recommendations',
      'Ask the Office',
      'Leave a Review',
      'Book Your Next Stay',
      'Optional Camper Connection',
    ]
  }
  return items
}

export default async function FrontDeskCardPrintPage() {
  const { campground } = await loadOwnerCampground()
  if (!campground) redirect('/owner/login')

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.getroadwave.com'
  const guestHubUrl = `${siteUrl}/campground/${campground.slug}`

  // QR PNG generated server-side so the rendered HTML ships with
  // the image already embedded as a data URL -- no async render
  // gap on the client before print.
  let qrDataUrl: string
  try {
    qrDataUrl = await QR.toDataURL(guestHubUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 1000,
      color: { dark: '#0a0f1c', light: '#ffffff' },
    })
  } catch (err) {
    console.error('[front-desk-card] QR render failed:', err)
    qrDataUrl = ''
  }

  const bullets = buildBullets({
    hasWifi: campground.show_wifi && !!campground.wifi_network_name,
    hasMap: campground.show_park_map && !!campground.park_map_url,
    hasRules: campground.show_rules && !!campground.rules_text,
    hasEmergency:
      campground.show_emergency_info &&
      !!(
        campground.emergency_contact_number ||
        campground.emergency_after_hours ||
        campground.emergency_shelter_notes ||
        campground.emergency_other_notes
      ),
    hasLocalRecs:
      campground.show_local_recommendations &&
      !!campground.local_recommendations_text,
    hasContactOffice: campground.feature_contact_office_enabled,
    hasReview:
      campground.feature_review_enabled && !!campground.google_review_url,
    hasBookAgain:
      campground.feature_book_again_enabled && !!campground.booking_url,
  })

  const where = [campground.city, campground.region].filter(Boolean).join(', ')
  const contactParts: string[] = []
  if (campground.phone) contactParts.push(campground.phone)
  if (campground.website) {
    // Strip protocol for the printed display; the link is on the
    // public welcome page anyway.
    contactParts.push(campground.website.replace(/^https?:\/\//i, ''))
  }
  const contactLine = contactParts.join(' · ')

  return (
    <>
      {/* Inline print styles. Tailwind's `print:` variants work too
          but inlining the @media print block keeps every print rule
          in one auditable place. */}
      <style>{`
        @page {
          size: auto;
          margin: 0.4in;
        }
        @media print {
          html, body {
            background: #ffffff !important;
            color: #0a0f1c !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card {
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      {/* AutoPrintOnLoad waits for the QR image to decode then fires
          window.print() once. The visible PrintCardButton below is
          the fallback for browsers that ignore the auto-fire. */}
      <AutoPrintOnLoad />

      <main className="min-h-screen bg-night text-cream py-8 px-4 sm:px-6 print:py-0 print:px-0">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Screen-only toolbar. Hidden when printing. */}
          <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-card px-4 py-3">
            <div className="text-xs text-mist leading-snug">
              The print dialog should appear automatically. If it
              doesn&apos;t, use the Print button on the right.
            </div>
            <PrintCardButton />
          </div>

          {/* THE PRINTABLE CARD. Light card on white so it prints
              well on standard printers without burning ink. */}
          <article className="print-card mx-auto rounded-2xl bg-white text-[#0a0f1c] px-6 py-7 sm:px-10 sm:py-9 shadow-2xl shadow-black/30 print:shadow-none print:rounded-none">
            {/* Top: campground identity. Campground-first, RoadWave-
                second per the new product positioning. */}
            <header className="text-center space-y-2 mb-4">
              {campground.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- partner logos vary in dimension
                <img
                  src={campground.logo_url}
                  alt={`${campground.name} logo`}
                  className="mx-auto h-20 w-auto object-contain"
                />
              ) : null}
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {campground.name}
              </h1>
              {where && (
                <p className="text-sm text-[#475569]">{where}</p>
              )}
              {contactLine && (
                <p className="text-xs text-[#64748b]">{contactLine}</p>
              )}
            </header>

            {/* Welcome headline + invitation. The two-line copy below
                the campground name. */}
            <section className="text-center space-y-1 mb-5">
              <p className="text-base sm:text-lg font-bold text-[#f59e0b]">
                Welcome to {campground.name}
              </p>
              <p className="text-base sm:text-lg font-semibold">
                Scan for Wi-Fi, park info, updates &amp; help.
              </p>
            </section>

            {/* QR on a generous white well. */}
            <div className="mx-auto w-full max-w-[360px] aspect-square rounded-2xl border border-[#e2e8f0] bg-white p-3 mb-4 grid place-items-center">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL, no Next/Image needed
                <img
                  src={qrDataUrl}
                  alt={`Scan to visit the ${campground.name} guest hub`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <p className="text-sm text-[#64748b]">QR unavailable.</p>
              )}
            </div>

            <p className="text-center text-sm text-[#475569] mb-5">
              No app download required for basic park info.
            </p>

            {/* Bullets — only enabled sections (with generic fallback). */}
            <section className="mb-5">
              <p className="text-center text-[11px] uppercase tracking-[0.18em] font-semibold text-[#64748b] mb-3">
                What you can do
              </p>
              <ul className="grid grid-cols-2 gap-y-1 gap-x-4 text-sm">
                {bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span aria-hidden className="text-[#f59e0b] mt-0.5">
                      ✓
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* URL line — handy when someone wants to type it. */}
            <p className="text-center text-[11px] text-[#64748b] mb-4 break-all">
              {guestHubUrl}
            </p>

            {/* Bottom: Powered by RoadWave. Secondary branding. */}
            <footer className="text-center pt-3 border-t border-[#e2e8f0]">
              <p className="text-[11px] text-[#64748b]">
                Powered by{' '}
                <span className="font-semibold text-[#0a0f1c]">
                  RoadWave
                </span>{' '}
                <span aria-hidden>👋</span>
              </p>
              <p className="text-[10px] text-[#94a3b8] mt-1">
                Not an emergency service — call 911 first, then notify
                campground staff.
              </p>
            </footer>
          </article>

          {/* Screen-only return link. Hidden when printing. */}
          <div className="no-print text-center">
            <a
              href="/owner/qr"
              className="text-xs text-mist hover:text-cream underline-offset-2 hover:underline"
            >
              ← Back to QR codes
            </a>
          </div>
        </div>
      </main>
    </>
  )
}
