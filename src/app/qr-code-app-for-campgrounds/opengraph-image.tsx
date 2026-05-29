import { OG_CONTENT_TYPE, OG_SIZE, renderRoadwaveOg } from '@/lib/og/page-og'

// Branded 1200x630 social-preview image for /qr-code-app-for-campgrounds.
// Next.js auto-emits <meta property="og:image"> for this route segment
// via the opengraph-image file convention.

export const alt = 'QR Code App for Campgrounds — RoadWave'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image() {
  return renderRoadwaveOg({
    headline: 'QR Code App for Campgrounds',
    subtext:
      'Wi-Fi, maps, updates, office messages, reviews, rebooking, and camper connections.',
  })
}
