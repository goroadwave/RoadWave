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

// JSON-LD Organization schema, emitted once into every page's <body>
// (Google reads structured data from anywhere in the document). Deliberately
// minimal and accurate:
//   - No `logo`: RoadWave has no raster brand-mark asset — the `Logo`
//     component is pure CSS text + emoji. Pointing at the favicon, the
//     riley mascot, or one of the page OG cards would all be misleading.
//   - No `sameAs`: RoadWave has no public social profiles linked from
//     the codebase or footer.
//   - No LocalBusiness / address / rating: RoadWave is an app, not a
//     visitable place, and we have no real reviews to cite.
// If/when real assets are added (brand logo, X/LinkedIn profile, etc.)
// this is the one place to extend.
const ORGANIZATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
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
        {/* Organization JSON-LD for Google's Knowledge Graph. Emitted via
            a plain <script> tag rather than next/script so it ships in
            the initial SSR HTML (Googlebot reads the body, no JS exec). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_SCHEMA) }}
        />
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
