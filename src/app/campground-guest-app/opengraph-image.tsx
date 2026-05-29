import { OG_CONTENT_TYPE, OG_SIZE, renderRoadwaveOg } from '@/lib/og/page-og'

// Branded 1200x630 social-preview image for /campground-guest-app.
// Next.js auto-emits <meta property="og:image"> for this route segment
// via the opengraph-image file convention.

export const alt = 'Campground Guest App for RV Parks — RoadWave'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image() {
  return renderRoadwaveOg({
    headline: 'Campground Guest App for RV Parks',
    subtext:
      'A simple guest communication and camper connection tool — no app download required.',
  })
}
