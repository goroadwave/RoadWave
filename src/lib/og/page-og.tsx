import { ImageResponse } from 'next/og'

// Shared 1200x630 social-preview (OG / Twitter) template for the public
// SEO landing pages. Each route's opengraph-image.tsx + twitter-image.tsx
// call renderRoadwaveOg() with the page-specific headline + subtext;
// Next.js handles emitting <meta property="og:image"> and
// <meta name="twitter:image"> automatically via the file conventions.
//
// On-brand: dark-navy background, amber radial glow, cream/amber
// wordmark with the waving hand AFTER the full word (matching the live
// Logo component — not the legacy "RoadWa👋e" variant), large cream
// headline, mist subtext, amber accent rule across the bottom.

export const OG_SIZE = { width: 1200, height: 630 } as const
export const OG_CONTENT_TYPE = 'image/png'

// Brand colour tokens mirrored from globals.css @theme so the image
// matches the site exactly.
const NIGHT = '#0a0f1c'
const FLAME = '#f59e0b'
const CREAM = '#f5ecd9'
const MIST = '#94a3b8'

export function renderRoadwaveOg({
  headline,
  subtext,
  eyebrow = 'For Campground Owners',
}: {
  headline: string
  subtext: string
  eyebrow?: string
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: NIGHT,
          backgroundImage:
            'radial-gradient(640px 440px at 88% 8%, rgba(245,158,11,0.22) 0%, rgba(245,158,11,0) 60%), radial-gradient(560px 380px at 4% 92%, rgba(245,158,11,0.10) 0%, rgba(245,158,11,0) 60%)',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px 80px',
          color: CREAM,
          fontFamily: 'system-ui, "Segoe UI", Helvetica, sans-serif',
        }}
      >
        {/* Wordmark — Road (cream) + Wave (amber) + 👋 AFTER the word. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 56,
            fontWeight: 800,
            letterSpacing: '-0.025em',
            lineHeight: 1,
          }}
        >
          <span style={{ color: CREAM }}>Road</span>
          <span style={{ color: FLAME }}>Wave</span>
          <span style={{ marginLeft: 16, fontSize: 48 }}>👋</span>
        </div>

        {/* Body — vertically centered between logo and footer */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
            paddingTop: 24,
            paddingBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              color: FLAME,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '0.20em',
              textTransform: 'uppercase',
              marginBottom: 28,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-0.025em',
              maxWidth: 1040,
            }}
          >
            {headline}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 30,
              color: MIST,
              marginTop: 28,
              lineHeight: 1.4,
              maxWidth: 1000,
            }}
          >
            {subtext}
          </div>
        </div>

        {/* Footer rule + domain + tagline */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '2px solid rgba(245,158,11,0.32)',
            paddingTop: 22,
          }}
        >
          <span style={{ color: CREAM, fontSize: 22, fontWeight: 600 }}>
            getroadwave.com
          </span>
          <span style={{ color: MIST, fontSize: 22 }}>
            Free 30-day pilot · No annual contract
          </span>
        </div>
      </div>
    ),
    { ...OG_SIZE, emoji: 'twemoji' },
  )
}
