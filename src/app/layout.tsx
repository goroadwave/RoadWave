import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, DM_Sans, Instrument_Serif } from 'next/font/google'
import { FloatingTourButton } from '@/components/ui/floating-tour-button'
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
  description: 'Privacy-first campground connections for RVers.',
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
        {children}
        <FloatingTourButton />
      </body>
    </html>
  )
}
