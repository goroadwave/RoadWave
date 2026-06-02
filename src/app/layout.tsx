import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, DM_Sans, Instrument_Serif } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { GuestSupportProvider } from '@/components/support/guest-support-context'
import { OwnerSupportProvider } from '@/components/support/owner-support-context'
import { OwnerTourProvider } from '@/components/support/owner-tour-context'
import { TourProvider } from '@/components/support/tour-context'
import { FloatingTourButton } from '@/components/ui/floating-tour-button'
import { SiteFooter } from '@/components/ui/site-footer'
import './globals.css'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['800'],
  variable: '--font-bricolage',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const instrument = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument',
  display: 'swap',
})

export const metadata: Metadata = {
  // Ensures relative URLs in route-level metadata (og:image/twitter:image
  // from the opengraph-image.tsx / twitter-image.tsx file conventions, plus
  // any other relative og/twitter image paths) resolve to the canonical
  // production domain rather than localhost in dev or the auto-detected
  // Vercel deployment URL in prod.
  metadataBase: new URL('https://www.getroadwave.com'),
  title: 'RoadWave',
  description: 'A private way to see campground updates, find shared interests, and say hello only when you want to.',
}

// Site-wide JSON-LD, emitted once into every page's <body> via the root
// layout. Google (and most AI crawlers) read structured data from anywhere
// in the document, so a single block here covers the whole site without
// per-page boilerplate.
//
// What we emit:
//   - Organization: brand identity + customer-service contact
//   - WebSite:      the site itself (helps Google's sitelink box +
//                   establishes name-of-site for AI quoting)
//   - SoftwareApplication: the RoadWave product
//
// Deliberate, honest omissions:
//   - No `logo`: RoadWave has no raster brand-mark asset — the `Logo`
//     component is pure CSS text + emoji. Pointing at the favicon, the
//     riley mascot, or a per-page OG card would all be misleading.
//   - No `sameAs`: no public RoadWave social profiles exist.
//   - No LocalBusiness / address: RoadWave is software, not a visitable
//     place.
//   - No aggregateRating / review: no real customer reviews to cite.
//   - No `offers` on SoftwareApplication: pricing is "Founding Campground
//     plans start at $39/month" with a free 30-day pilot — Schema.org
//     Offer expects a single price, and listing $39 alone would be a
//     misrepresentation of the actual purchase flow.
//
// Anchor IDs (#organization, #website, #app) let Schema.org references
// across the JSON-LD blocks share the same identity (e.g. WebSite.publisher
// points at #organization rather than duplicating the brand fields).
const ROADWAVE_POSITIONING =
  'RoadWave is a QR-powered guest hub for campgrounds and RV parks. Guests scan one code to access Wi-Fi, maps, rules, bulletins, office messages, reviews, rebooking, and optional privacy-first camper connections — no app download required.'

const ORGANIZATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://www.getroadwave.com/#organization',
  name: 'RoadWave',
  url: 'https://www.getroadwave.com',
  description:
    'RoadWave is a QR-powered guest communication and camper connection tool for campgrounds.',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    email: 'hello@getroadwave.com',
    url: 'https://www.getroadwave.com/contact',
    availableLanguage: ['English'],
  },
} as const

const WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://www.getroadwave.com/#website',
  name: 'RoadWave',
  url: 'https://www.getroadwave.com',
  description: ROADWAVE_POSITIONING,
  publisher: { '@id': 'https://www.getroadwave.com/#organization' },
  inLanguage: 'en-US',
} as const

const SOFTWARE_APPLICATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': 'https://www.getroadwave.com/#app',
  name: 'RoadWave',
  url: 'https://www.getroadwave.com',
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Campground Guest Communication',
  operatingSystem: 'Web (any modern browser)',
  description: ROADWAVE_POSITIONING,
  audience: {
    '@type': 'Audience',
    audienceType: 'Campground and RV park owners and operators',
  },
  featureList: [
    'One-QR guest hub (Wi-Fi, maps, rules)',
    'Owner-published bulletins and updates',
    'Office messages between guests and the front desk',
    'Meetups and weather-safety notices',
    'Guest review and rebooking prompts',
    'Optional privacy-first camper connections (mutual Waves)',
  ],
  provider: { '@id': 'https://www.getroadwave.com/#organization' },
} as const

const SITE_JSON_LD = [
  ORGANIZATION_SCHEMA,
  WEBSITE_SCHEMA,
  SOFTWARE_APPLICATION_SCHEMA,
]

export const viewport: Viewport = {
  themeColor: '#0a0f1c',
  width: 'device-width',
  initialScale: 1,
  // Lets pages opt into `env(safe-area-inset-*)` so the bottom CTAs
  // on the QR / check-in flow don't sit under iPhone Safari's URL
  // bar or the iOS home indicator. The background already fills the
  // viewport so extending under the safe area has no visual cost.
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${dmSans.variable} ${instrument.variable} antialiased`}
    >
      <body className="bg-night text-cream font-sans">
        {/* Site-wide JSON-LD (Organization + WebSite + SoftwareApplication)
            for Google's Knowledge Graph and AI crawlers. Emitted via plain
            <script> tags so it ships in the initial SSR HTML — no JS exec
            required for any crawler to read it. One block per @type so
            Schema.org @id references resolve cleanly. */}
        {SITE_JSON_LD.map((schema) => (
          <script
            key={schema['@id']}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
        {/* Riley's tour + chat state lives at the root so the floating
            Riley button (mounted here) and the actual chat panels +
            tour overlays (mounted inside the (app) and owner (authed)
            layouts respectively) share the same context. Both audiences
            have their own provider pair — the camper-side one and the
            owner-side one — and the providers themselves are inert
            until their UI components register on mount. The button
            picks which set to drive based on the pathname. */}
        <GuestSupportProvider>
          <TourProvider>
            <OwnerSupportProvider>
              <OwnerTourProvider>
                {children}
                <SiteFooter />
                <FloatingTourButton />
              </OwnerTourProvider>
            </OwnerSupportProvider>
          </TourProvider>
        </GuestSupportProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
