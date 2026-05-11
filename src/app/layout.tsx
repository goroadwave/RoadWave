import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, DM_Sans, Instrument_Serif } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { GuestSupportProvider } from '@/components/support/guest-support-context'
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
  title: 'RoadWave',
  description: 'A private way to see campground updates, find shared interests, and say hello only when you want to.',
}

export const viewport: Viewport = {
  themeColor: '#0a0f1c',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${dmSans.variable} ${instrument.variable} antialiased`}
    >
      <body className="bg-night text-cream font-sans">
        {/* Riley's tour + chat state lives at the root so the floating
            Riley button (mounted here) and the actual chat panel +
            tour overlay (mounted inside the (app) layout) share the
            same context. The providers themselves are inert until
            their UI components register on mount. */}
        <GuestSupportProvider>
          <TourProvider>
            {children}
            <SiteFooter />
            <FloatingTourButton />
          </TourProvider>
        </GuestSupportProvider>
        <Analytics />
      </body>
    </html>
  )
}
