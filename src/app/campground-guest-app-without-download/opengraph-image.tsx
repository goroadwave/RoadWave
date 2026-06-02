import { OG_CONTENT_TYPE, OG_SIZE, renderRoadwaveOg } from '@/lib/og/page-og'

export const alt = 'Campground Guest App Without an App Download — RoadWave'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image() {
  return renderRoadwaveOg({
    headline: 'Campground Guest App, No Download',
    subtext:
      'A QR-powered guest hub for campgrounds and RV parks. Campground info works without an install.',
  })
}
