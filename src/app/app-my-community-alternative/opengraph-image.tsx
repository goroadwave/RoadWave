import { OG_CONTENT_TYPE, OG_SIZE, renderRoadwaveOg } from '@/lib/og/page-og'

// Branded 1200x630 social-preview image for /app-my-community-alternative.
// Next.js's opengraph-image file convention automatically emits the
// <meta property="og:image"> tag (plus og:image:type/width/height/alt) for
// this route segment, so page.tsx does not need an explicit metadata.openGraph.images entry.

export const alt =
  'App My Community Alternative for Campgrounds — RoadWave'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image() {
  return renderRoadwaveOg({
    headline: 'App My Community Alternative for Campgrounds',
    subtext: 'A simpler QR-powered guest app with a free 30-day pilot.',
  })
}
